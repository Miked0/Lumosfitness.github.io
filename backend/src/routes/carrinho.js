const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { carrinho: carrinhoCache } = require('../cache/redis');
const { createLogger } = require('../utils/logger');
const { validateParams, validateBody } = require('../middleware/validation');
const { body, param } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const logger = createLogger('carrinho');

// ============= MIDDLEWARE PARA SESSION ID =============
const ensureSessionId = (req, res, next) => {
  let sessionId = req.params.sessionId || req.body.sessionId || req.headers['x-session-id'];
  
  if (!sessionId) {
    sessionId = uuidv4();
    logger.info(`Nova sessão de carrinho criada: ${sessionId}`);
  }
  
  req.sessionId = sessionId;
  next();
};

// ============= ROTAS DO CARRINHO =============

/**
 * GET /api/carrinho/:sessionId
 * Obter carrinho de compras
 */
router.get('/:sessionId',
  [
    param('sessionId').isUUID(4).withMessage('Session ID deve ser um UUID válido')
  ],
  validateParams,
  ensureSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req;
      
      // Tentar obter do Redis primeiro
      let carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho) {
        // Se não existe no Redis, verificar no banco
        const result = await query(
          'SELECT * FROM carrinhos WHERE session_id = $1',
          [sessionId]
        );
        
        if (result.rows.length > 0) {
          carrinho = {
            sessionId,
            itens: result.rows[0].itens || [],
            total: parseFloat(result.rows[0].total) || 0,
            ultimaAtualizacao: result.rows[0].atualizado_em
          };
          
          // Salvar no Redis para próximas consultas
          await carrinhoCache.save(sessionId, carrinho);
        } else {
          // Carrinho não existe, criar vazio
          carrinho = {
            sessionId,
            itens: [],
            total: 0,
            ultimaAtualizacao: new Date()
          };
        }
      }
      
      // Verificar se produtos ainda estão disponíveis
      if (carrinho.itens.length > 0) {
        const produtoIds = carrinho.itens.map(item => item.produtoId);
        const produtosResult = await query(
          'SELECT id, nome, preco, estoque, ativo FROM produtos WHERE id = ANY($1)',
          [produtoIds]
        );
        
        const produtosMap = produtosResult.rows.reduce((map, produto) => {
          map[produto.id] = produto;
          return map;
        }, {});
        
        // Atualizar informações dos itens e remover indisponíveis
        carrinho.itens = carrinho.itens
          .filter(item => {
            const produto = produtosMap[item.produtoId];
            return produto && produto.ativo && produto.estoque > 0;
          })
          .map(item => {
            const produto = produtosMap[item.produtoId];
            return {
              ...item,
              nome: produto.nome,
              precoAtual: parseFloat(produto.preco),
              estoqueDisponivel: produto.estoque,
              quantidade: Math.min(item.quantidade, produto.estoque)
            };
          });
        
        // Recalcular total
        carrinho.total = carrinho.itens.reduce((sum, item) => {
          return sum + (item.precoAtual * item.quantidade);
        }, 0);
        
        // Atualizar cache se houve mudanças
        await carrinhoCache.save(sessionId, carrinho);
      }
      
      logger.info(`Carrinho obtido para sessão ${sessionId}`, {
        itens: carrinho.itens.length,
        total: carrinho.total
      });
      
      res.json({
        success: true,
        data: carrinho
      });
      
    } catch (error) {
      logger.error('Erro ao obter carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * POST /api/carrinho/:sessionId/adicionar
 * Adicionar item ao carrinho
 */
router.post('/:sessionId/adicionar',
  [
    param('sessionId').isUUID(4).withMessage('Session ID deve ser um UUID válido'),
    body('produtoId').isInt({ min: 1 }).withMessage('ID do produto é obrigatório'),
    body('quantidade').isInt({ min: 1, max: 10 }).withMessage('Quantidade deve ser entre 1 e 10'),
    body('tamanho').isString().trim().isLength({ min: 1, max: 10 }).withMessage('Tamanho é obrigatório'),
    body('cor').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Cor é obrigatória')
  ],
  validateParams,
  validateBody,
  ensureSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req;
      const { produtoId, quantidade, tamanho, cor } = req.body;
      
      // Verificar se produto existe e está disponível
      const produtoResult = await query(
        'SELECT * FROM produtos WHERE id = $1 AND ativo = true',
        [produtoId]
      );
      
      if (produtoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado ou indisponível'
        });
      }
      
      const produto = produtoResult.rows[0];
      
      // Verificar estoque
      if (produto.estoque < quantidade) {
        return res.status(400).json({
          success: false,
          message: `Estoque insuficiente. Disponível: ${produto.estoque}`,
          estoqueDisponivel: produto.estoque
        });
      }
      
      // Verificar se tamanho e cor são válidos
      const tamanhosDisponiveis = produto.tamanhos || [];
      const coresDisponiveis = produto.cores || [];
      
      if (!tamanhosDisponiveis.includes(tamanho)) {
        return res.status(400).json({
          success: false,
          message: 'Tamanho não disponível',
          tamanhosDisponiveis
        });
      }
      
      if (!coresDisponiveis.includes(cor)) {
        return res.status(400).json({
          success: false,
          message: 'Cor não disponível',
          coresDisponiveis
        });
      }
      
      // Obter carrinho atual
      let carrinho = await carrinhoCache.get(sessionId) || {
        sessionId,
        itens: [],
        total: 0
      };
      
      // Verificar se item já existe no carrinho (mesmo produto, tamanho e cor)
      const itemExistenteIndex = carrinho.itens.findIndex(item => 
        item.produtoId === produtoId && 
        item.tamanho === tamanho && 
        item.cor === cor
      );
      
      if (itemExistenteIndex >= 0) {
        // Atualizar quantidade do item existente
        const novaQuantidade = carrinho.itens[itemExistenteIndex].quantidade + quantidade;
        
        if (novaQuantidade > produto.estoque) {
          return res.status(400).json({
            success: false,
            message: `Quantidade total excede estoque. Máximo: ${produto.estoque}`,
            quantidadeAtual: carrinho.itens[itemExistenteIndex].quantidade,
            estoqueDisponivel: produto.estoque
          });
        }
        
        carrinho.itens[itemExistenteIndex].quantidade = novaQuantidade;
        carrinho.itens[itemExistenteIndex].subtotal = novaQuantidade * parseFloat(produto.preco);
      } else {
        // Adicionar novo item
        const novoItem = {
          id: uuidv4(),
          produtoId,
          nome: produto.nome,
          preco: parseFloat(produto.preco),
          quantidade,
          tamanho,
          cor,
          subtotal: quantidade * parseFloat(produto.preco),
          imagem: produto.imagem,
          adicionadoEm: new Date()
        };
        
        carrinho.itens.push(novoItem);
      }
      
      // Recalcular total
      carrinho.total = carrinho.itens.reduce((sum, item) => sum + item.subtotal, 0);
      carrinho.ultimaAtualizacao = new Date();
      
      // Salvar no cache
      await carrinhoCache.save(sessionId, carrinho);
      
      // Salvar no banco de dados
      await query(
        `INSERT INTO carrinhos (session_id, itens, total) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (session_id) 
         DO UPDATE SET itens = $2, total = $3, atualizado_em = CURRENT_TIMESTAMP`,
        [sessionId, JSON.stringify(carrinho.itens), carrinho.total]
      );
      
      logger.info(`Item adicionado ao carrinho ${sessionId}`, {
        produtoId,
        quantidade,
        tamanho,
        cor,
        totalItens: carrinho.itens.length,
        valorTotal: carrinho.total
      });
      
      res.json({
        success: true,
        message: 'Produto adicionado ao carrinho',
        data: carrinho
      });
      
    } catch (error) {
      logger.error('Erro ao adicionar item ao carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * PUT /api/carrinho/:sessionId/item/:itemId
 * Atualizar quantidade de um item do carrinho
 */
router.put('/:sessionId/item/:itemId',
  [
    param('sessionId').isUUID(4),
    param('itemId').isUUID(4),
    body('quantidade').isInt({ min: 1, max: 10 })
  ],
  validateParams,
  validateBody,
  ensureSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req;
      const { itemId } = req.params;
      const { quantidade } = req.body;
      
      let carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho || carrinho.itens.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Carrinho não encontrado'
        });
      }
      
      const itemIndex = carrinho.itens.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado no carrinho'
        });
      }
      
      const item = carrinho.itens[itemIndex];
      
      // Verificar estoque atual do produto
      const produtoResult = await query(
        'SELECT estoque FROM produtos WHERE id = $1 AND ativo = true',
        [item.produtoId]
      );
      
      if (produtoResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Produto não está mais disponível'
        });
      }
      
      const estoqueDisponivel = produtoResult.rows[0].estoque;
      
      if (quantidade > estoqueDisponivel) {
        return res.status(400).json({
          success: false,
          message: `Estoque insuficiente. Disponível: ${estoqueDisponivel}`,
          estoqueDisponivel
        });
      }
      
      // Atualizar item
      carrinho.itens[itemIndex].quantidade = quantidade;
      carrinho.itens[itemIndex].subtotal = quantidade * item.preco;
      
      // Recalcular total
      carrinho.total = carrinho.itens.reduce((sum, item) => sum + item.subtotal, 0);
      carrinho.ultimaAtualizacao = new Date();
      
      // Salvar alterações
      await carrinhoCache.save(sessionId, carrinho);
      
      await query(
        'UPDATE carrinhos SET itens = $1, total = $2, atualizado_em = CURRENT_TIMESTAMP WHERE session_id = $3',
        [JSON.stringify(carrinho.itens), carrinho.total, sessionId]
      );
      
      logger.info(`Item ${itemId} atualizado no carrinho ${sessionId}`, {
        novaQuantidade: quantidade,
        valorTotal: carrinho.total
      });
      
      res.json({
        success: true,
        message: 'Item atualizado',
        data: carrinho
      });
      
    } catch (error) {
      logger.error('Erro ao atualizar item do carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * DELETE /api/carrinho/:sessionId/item/:itemId
 * Remover item do carrinho
 */
router.delete('/:sessionId/item/:itemId',
  [
    param('sessionId').isUUID(4),
    param('itemId').isUUID(4)
  ],
  validateParams,
  ensureSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req;
      const { itemId } = req.params;
      
      let carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho || carrinho.itens.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Carrinho não encontrado'
        });
      }
      
      const itemIndex = carrinho.itens.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Item não encontrado no carrinho'
        });
      }
      
      // Remover item
      const itemRemovido = carrinho.itens.splice(itemIndex, 1)[0];
      
      // Recalcular total
      carrinho.total = carrinho.itens.reduce((sum, item) => sum + item.subtotal, 0);
      carrinho.ultimaAtualizacao = new Date();
      
      // Salvar alterações
      await carrinhoCache.save(sessionId, carrinho);
      
      await query(
        'UPDATE carrinhos SET itens = $1, total = $2, atualizado_em = CURRENT_TIMESTAMP WHERE session_id = $3',
        [JSON.stringify(carrinho.itens), carrinho.total, sessionId]
      );
      
      logger.info(`Item ${itemId} removido do carrinho ${sessionId}`, {
        produtoRemovido: itemRemovido.nome,
        itensRestantes: carrinho.itens.length,
        valorTotal: carrinho.total
      });
      
      res.json({
        success: true,
        message: 'Item removido do carrinho',
        data: carrinho,
        itemRemovido
      });
      
    } catch (error) {
      logger.error('Erro ao remover item do carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * DELETE /api/carrinho/:sessionId
 * Limpar carrinho
 */
router.delete('/:sessionId',
  [
    param('sessionId').isUUID(4)
  ],
  validateParams,
  ensureSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req;
      
      // Limpar do cache
      await carrinhoCache.remove(sessionId);
      
      // Limpar do banco
      await query(
        'DELETE FROM carrinhos WHERE session_id = $1',
        [sessionId]
      );
      
      logger.info(`Carrinho ${sessionId} limpo`);
      
      res.json({
        success: true,
        message: 'Carrinho limpo com sucesso',
        data: {
          sessionId,
          itens: [],
          total: 0
        }
      });
      
    } catch (error) {
      logger.error('Erro ao limpar carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * GET /api/carrinho/:sessionId/resumo
 * Obter resumo do carrinho (apenas totais)
 */
router.get('/:sessionId/resumo',
  [
    param('sessionId').isUUID(4)
  ],
  validateParams,
  ensureSessionId,
  async (req, res) => {
    try {
      const { sessionId } = req;
      
      const carrinho = await carrinhoCache.get(sessionId);
      
      if (!carrinho) {
        return res.json({
          success: true,
          data: {
            totalItens: 0,
            valorTotal: 0,
            temItens: false
          }
        });
      }
      
      const totalItens = carrinho.itens.reduce((sum, item) => sum + item.quantidade, 0);
      
      res.json({
        success: true,
        data: {
          totalItens,
          valorTotal: carrinho.total,
          temItens: carrinho.itens.length > 0,
          ultimaAtualizacao: carrinho.ultimaAtualizacao
        }
      });
      
    } catch (error) {
      logger.error('Erro ao obter resumo do carrinho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

module.exports = router;