const express = require('express');
const router = express.Router();
const { query, transaction } = require('../database/connection');
const { carrinho: carrinhoCache } = require('../cache/redis');
const mercadoPagoService = require('../services/mercadoPago');
const freteService = require('../services/frete');
const omieService = require('../services/omie');
const { createLogger } = require('../utils/logger');
const { validateBody } = require('../middleware/validation');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const logger = createLogger('checkout');

// ============= MIDDLEWARE DE VALIDAÇÃO =============
const validarDadosCheckout = [
  body('sessionId').isUUID(4).withMessage('Session ID deve ser um UUID válido'),
  body('cliente.nome').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('cliente.email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('cliente.telefone').isString().trim().matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/).withMessage('Telefone inválido'),
  body('cliente.cpf').isString().trim().matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/).withMessage('CPF inválido'),
  body('endereco.cep').isString().trim().matches(/^\d{5}-?\d{3}$/).withMessage('CEP inválido'),
  body('endereco.rua').isString().trim().isLength({ min: 5, max: 200 }).withMessage('Endereço deve ter entre 5 e 200 caracteres'),
  body('endereco.numero').isString().trim().isLength({ min: 1, max: 20 }).withMessage('Número é obrigatório'),
  body('endereco.bairro').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Bairro deve ter entre 2 e 100 caracteres'),
  body('endereco.cidade').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Cidade deve ter entre 2 e 100 caracteres'),
  body('endereco.estado').isString().trim().isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres'),
  body('pagamento.metodo').isIn(['pix', 'cartao', 'boleto']).withMessage('Método de pagamento inválido'),
  body('frete.servico').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Serviço de frete inválido'),
  body('frete.valor').isFloat({ min: 0 }).withMessage('Valor do frete inválido')
];

// ============= ROTAS DE CHECKOUT =============

/**
 * POST /api/checkout/processar
 * Processar checkout completo
 */
router.post('/processar',
  validarDadosCheckout,
  validateBody,
  async (req, res) => {
    let pedidoId = null;
    
    try {
      const {
        sessionId,
        cliente,
        endereco,
        pagamento,
        frete,
        cupom,
        observacoes
      } = req.body;

      logger.info(`Iniciando checkout para sessão ${sessionId}`, {
        cliente: cliente.email,
        metodoPagamento: pagamento.metodo,
        valorFrete: frete.valor
      });

      // 1. Obter carrinho
      const carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho || carrinho.itens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Carrinho vazio ou sessão inválida'
        });
      }

      // 2. Verificar estoque novamente
      const verificacaoEstoque = await verificarDisponibilidadeEstoque(carrinho.itens);
      
      if (!verificacaoEstoque.disponivel) {
        return res.status(400).json({
          success: false,
          message: 'Alguns produtos não estão mais disponíveis',
          itensIndisponiveis: verificacaoEstoque.itensIndisponiveis
        });
      }

      // 3. Validar frete
      const validacaoFrete = await freteService.validarFrete({
        cep: endereco.cep,
        itens: carrinho.itens,
        servicoSelecionado: frete.servico,
        valorEsperado: frete.valor
      });

      if (!validacaoFrete.valido) {
        return res.status(400).json({
          success: false,
          message: 'Dados de frete inválidos',
          freteAtualizado: validacaoFrete.freteAtualizado
        });
      }

      // 4. Aplicar cupom de desconto (se houver)
      let valorDesconto = 0;
      let dadosCupom = null;
      
      if (cupom && cupom.codigo) {
        const validacaoCupom = await validarCupomDesconto(cupom.codigo, carrinho.total);
        
        if (validacaoCupom.valido) {
          valorDesconto = validacaoCupom.valorDesconto;
          dadosCupom = validacaoCupom.cupom;
        } else {
          return res.status(400).json({
            success: false,
            message: validacaoCupom.motivo
          });
        }
      }

      // 5. Calcular valores finais
      const subtotal = carrinho.total;
      const valorFrete = parseFloat(frete.valor);
      const total = subtotal + valorFrete - valorDesconto;

      // 6. Iniciar transação de banco de dados
      const resultado = await transaction(async (client) => {
        // 6.1. Criar ou obter cliente
        const clienteId = await criarOuObterCliente(client, cliente);

        // 6.2. Criar pedido
        const pedidoResult = await client.query(
          `INSERT INTO pedidos (
            cliente_id, status, subtotal, frete, total, metodo_pagamento, 
            dados_pagamento, endereco_entrega, dados_frete, observacoes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING *`,
          [
            clienteId,
            'pendente',
            subtotal,
            valorFrete,
            total,
            pagamento.metodo,
            JSON.stringify(pagamento),
            JSON.stringify(endereco),
            JSON.stringify(frete),
            observacoes || null
          ]
        );

        const pedido = pedidoResult.rows[0];
        pedidoId = pedido.id;

        // 6.3. Criar itens do pedido
        for (const item of carrinho.itens) {
          await client.query(
            `INSERT INTO itens_pedido (
              pedido_id, produto_id, quantidade, preco_unitario, 
              tamanho, cor, subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              pedidoId,
              item.produtoId,
              item.quantidade,
              item.preco,
              item.tamanho,
              item.cor,
              item.subtotal
            ]
          );
        }

        // 6.4. Reservar estoque temporariamente
        for (const item of carrinho.itens) {
          await client.query(
            'UPDATE produtos SET estoque = estoque - $1 WHERE id = $2',
            [item.quantidade, item.produtoId]
          );

          // Registrar movimentação
          await client.query(
            `INSERT INTO movimentacoes_estoque (
              produto_id, tipo, quantidade, motivo, pedido_id, criado_por
            ) VALUES ($1, 'saida', $2, 'Reserva temporaria - checkout', $3, 'sistema')`,
            [item.produtoId, item.quantidade, pedidoId]
          );
        }

        return { pedido, clienteId };
      });

      const { pedido } = resultado;

      // 7. Processar pagamento
      let dadosPagamento = null;
      
      try {
        if (pagamento.metodo === 'pix') {
          dadosPagamento = await mercadoPagoService.criarPagamentoPix({
            pedidoId: pedido.id,
            cliente,
            valorTotal: total,
            descricao: `Pedido Lumos Fitness #${pedido.id}`
          });
        } else {
          // Para cartão e boleto, criar preferência
          dadosPagamento = await mercadoPagoService.criarPreferencia({
            pedidoId: pedido.id,
            itens: carrinho.itens,
            cliente,
            endereco,
            valorTotal: total,
            valorFrete,
            desconto: valorDesconto
          });
        }
      } catch (errorPagamento) {
        // Reverter reserva de estoque em caso de erro no pagamento
        await reverterReservaEstoque(pedido.id);
        
        throw new Error(`Erro ao processar pagamento: ${errorPagamento.message}`);
      }

      // 8. Atualizar pedido com dados do pagamento
      await query(
        'UPDATE pedidos SET dados_pagamento = $1 WHERE id = $2',
        [JSON.stringify(dadosPagamento), pedido.id]
      );

      // 9. Sincronizar com Omie ERP (não bloquear checkout se falhar)
      try {
        const omieResponse = await omieService.criarPedido({
          pedido,
          cliente,
          itens: carrinho.itens,
          endereco
        });
        
        if (omieResponse.success) {
          await query(
            'UPDATE pedidos SET omie_id = $1 WHERE id = $2',
            [omieResponse.pedidoId, pedido.id]
          );
        }
      } catch (omieError) {
        logger.warn(`Erro na sincronização com Omie para pedido ${pedido.id}:`, omieError);
      }

      // 10. Limpar carrinho
      await carrinhoCache.remove(sessionId);
      await query('DELETE FROM carrinhos WHERE session_id = $1', [sessionId]);

      logger.info(`Checkout concluído com sucesso`, {
        pedidoId: pedido.id,
        cliente: cliente.email,
        valor: total,
        metodoPagamento: pagamento.metodo
      });

      // 11. Preparar resposta
      const resposta = {
        success: true,
        message: 'Pedido criado com sucesso',
        pedido: {
          id: pedido.id,
          status: pedido.status,
          total: pedido.total,
          dataCriacao: pedido.criado_em,
          itens: carrinho.itens.length,
          metodoPagamento: pagamento.metodo
        },
        pagamento: dadosPagamento
      };

      res.status(201).json(resposta);

    } catch (error) {
      logger.error('Erro no checkout:', error);

      // Reverter reserva de estoque se pedido foi criado
      if (pedidoId) {
        try {
          await reverterReservaEstoque(pedidoId);
        } catch (reverterError) {
          logger.error('Erro ao reverter reserva de estoque:', reverterError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao processar pedido',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor'
      });
    }
  }
);

/**
 * POST /api/checkout/validar
 * Validar dados antes do checkout final
 */
router.post('/validar',
  [
    body('sessionId').isUUID(4),
    body('cep').matches(/^\d{5}-?\d{3}$/)
  ],
  validateBody,
  async (req, res) => {
    try {
      const { sessionId, cep } = req.body;

      // Obter carrinho
      const carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho || carrinho.itens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Carrinho vazio'
        });
      }

      // Verificar estoque
      const verificacaoEstoque = await verificarDisponibilidadeEstoque(carrinho.itens);
      
      // Calcular frete
      const opcoesFrete = await freteService.calcularFrete({
        cep,
        itens: carrinho.itens
      });

      res.json({
        success: true,
        data: {
          carrinho: {
            itens: carrinho.itens.length,
            total: carrinho.total
          },
          estoque: verificacaoEstoque,
          frete: opcoesFrete
        }
      });

    } catch (error) {
      logger.error('Erro na validação do checkout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * GET /api/checkout/resumo/:sessionId
 * Obter resumo do checkout
 */
router.get('/resumo/:sessionId',
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho || carrinho.itens.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Carrinho não encontrado'
        });
      }

      // Calcular resumo
      const resumo = {
        itens: carrinho.itens.map(item => ({
          nome: item.nome,
          quantidade: item.quantidade,
          preco: item.preco,
          subtotal: item.subtotal,
          tamanho: item.tamanho,
          cor: item.cor
        })),
        subtotal: carrinho.total,
        totalItens: carrinho.itens.reduce((sum, item) => sum + item.quantidade, 0)
      };

      res.json({
        success: true,
        data: resumo
      });

    } catch (error) {
      logger.error('Erro ao obter resumo do checkout:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// ============= FUNÇÕES AUXILIARES =============

/**
 * Verificar disponibilidade de estoque
 */
async function verificarDisponibilidadeEstoque(itens) {
  try {
    const produtoIds = itens.map(item => item.produtoId);
    
    const result = await query(
      'SELECT id, nome, estoque, ativo FROM produtos WHERE id = ANY($1)',
      [produtoIds]
    );
    
    const produtosMap = result.rows.reduce((map, produto) => {
      map[produto.id] = produto;
      return map;
    }, {});
    
    const itensIndisponiveis = [];
    let disponivel = true;
    
    for (const item of itens) {
      const produto = produtosMap[item.produtoId];
      
      if (!produto || !produto.ativo) {
        disponivel = false;
        itensIndisponiveis.push({
          produtoId: item.produtoId,
          nome: item.nome,
          motivo: 'Produto indisponível'
        });
      } else if (produto.estoque < item.quantidade) {
        disponivel = false;
        itensIndisponiveis.push({
          produtoId: item.produtoId,
          nome: produto.nome,
          quantidadeSolicitada: item.quantidade,
          estoqueDisponivel: produto.estoque,
          motivo: 'Estoque insuficiente'
        });
      }
    }
    
    return {
      disponivel,
      itensIndisponiveis
    };
    
  } catch (error) {
    logger.error('Erro ao verificar estoque:', error);
    throw error;
  }
}

/**
 * Criar ou obter cliente
 */
async function criarOuObterCliente(client, dadosCliente) {
  try {
    // Verificar se cliente já existe
    const clienteExistente = await client.query(
      'SELECT id FROM clientes WHERE email = $1',
      [dadosCliente.email]
    );
    
    if (clienteExistente.rows.length > 0) {
      // Atualizar dados do cliente
      await client.query(
        `UPDATE clientes SET 
         nome = $1, telefone = $2, cpf = $3, atualizado_em = CURRENT_TIMESTAMP 
         WHERE email = $4`,
        [dadosCliente.nome, dadosCliente.telefone, dadosCliente.cpf, dadosCliente.email]
      );
      
      return clienteExistente.rows[0].id;
    } else {
      // Criar novo cliente
      const novoCliente = await client.query(
        `INSERT INTO clientes (nome, email, telefone, cpf) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [dadosCliente.nome, dadosCliente.email, dadosCliente.telefone, dadosCliente.cpf]
      );
      
      return novoCliente.rows[0].id;
    }
  } catch (error) {
    logger.error('Erro ao criar/obter cliente:', error);
    throw error;
  }
}

/**
 * Validar cupom de desconto
 */
async function validarCupomDesconto(codigo, valorPedido) {
  // Implementação simples - pode ser expandida
  const cuponsValidos = {
    'BEMVINDO10': { tipo: 'percentual', valor: 10, minimoCompra: 100 },
    'FRETE15': { tipo: 'fixo', valor: 15, minimoCompra: 150 },
    'LUMOS20': { tipo: 'percentual', valor: 20, minimoCompra: 200 }
  };
  
  const cupom = cuponsValidos[codigo.toUpperCase()];
  
  if (!cupom) {
    return { valido: false, motivo: 'Cupom inválido' };
  }
  
  if (valorPedido < cupom.minimoCompra) {
    return { 
      valido: false, 
      motivo: `Valor mínimo para este cupom: R$ ${cupom.minimoCompra.toFixed(2)}` 
    };
  }
  
  const valorDesconto = cupom.tipo === 'percentual' 
    ? (valorPedido * cupom.valor / 100)
    : cupom.valor;
  
  return {
    valido: true,
    cupom,
    valorDesconto: Math.min(valorDesconto, valorPedido * 0.5) // Máximo 50% de desconto
  };
}

/**
 * Reverter reserva de estoque
 */
async function reverterReservaEstoque(pedidoId) {
  try {
    // Obter itens do pedido
    const result = await query(
      'SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = $1',
      [pedidoId]
    );
    
    // Reverter estoque para cada item
    for (const item of result.rows) {
      await query(
        'UPDATE produtos SET estoque = estoque + $1 WHERE id = $2',
        [item.quantidade, item.produto_id]
      );
      
      // Registrar movimentação
      await query(
        `INSERT INTO movimentacoes_estoque (
          produto_id, tipo, quantidade, motivo, pedido_id, criado_por
        ) VALUES ($1, 'entrada', $2, 'Reversao por erro no checkout', $3, 'sistema')`,
        [item.produto_id, item.quantidade, pedidoId]
      );
    }
    
    logger.info(`Estoque revertido para pedido ${pedidoId}`);
    
  } catch (error) {
    logger.error('Erro ao reverter estoque:', error);
    throw error;
  }
}

module.exports = router;