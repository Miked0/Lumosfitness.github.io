
const axios = require('axios');

class OmieService {
  constructor() {
    this.baseUrl = 'https://app.omie.com.br/api/v1/';
    this.appKey = process.env.OMIE_APP_KEY;
    this.appSecret = process.env.OMIE_APP_SECRET;
  }

  // Método base para chamadas à API
  async chamarApi(endpoint, call, params = {}) {
    try {
      const payload = {
        call,
        app_key: this.appKey,
        app_secret: this.appSecret,
        param: [params]
      };

      const response = await axios.post(`${this.baseUrl}${endpoint}/`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Erro na chamada Omie ${endpoint}:`, error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Sincronizar produto
  async sincronizarProduto(produto) {
    const produtoOmie = {
      codigo_produto: produto.omieId,
      descricao: produto.nome,
      reducao: produto.nome.substring(0, 20).toUpperCase(),
      categoria: produto.categoria,
      valor_unitario: produto.preco,
      estoque: produto.estoque,
      ativo: produto.ativo ? 'S' : 'N',
      descr_detalhada: produto.descricao,
      obs_internas: `Sincronizado do e-commerce em ${new Date().toISOString()}`,
      unidade: 'UN',
      peso_bruto: 0.2,
      peso_liquido: 0.2
    };

    return await this.chamarApi('geral/produtos', 'UpsertProduto', produtoOmie);
  }

  // Criar pedido de venda
  async criarPedidoVenda(pedido) {
    const pedidoOmie = {
      cabecalho: {
        codigo_pedido: pedido.id.toString(),
        codigo_cliente: await this.obterOuCriarCliente(pedido.cliente),
        data_previsao: new Date().toISOString().split('T')[0],
        etapa: '10', // Pedido confirmado
        codigo_parcela: '000',
        qtde_parcelas: 1,
        observacoes: `Pedido do e-commerce - Frete: ${pedido.frete.nome}`,
        informacoes_adicionais: {
          codigo_categoria: 'E-COMMERCE',
          codigo_conta_corrente: 1,
          numero_pedido_cliente: pedido.id.toString()
        }
      },
      det: pedido.itens.map((item, index) => ({
        ide: {
          codigo_item_integracao: `${pedido.id}-${index + 1}`
        },
        produto: {
          codigo_produto: item.omieId || item.produtoId.toString(),
          quantidade: item.quantidade,
          valor_unitario: item.preco,
          valor_mercadoria: item.preco * item.quantidade
        },
        observacao: {
          obs_item: `Tamanho: ${item.tamanho}, Cor: ${item.cor}`
        }
      })),
      frete: {
        codigo_transportadora: this.obterCodigoTransportadora(pedido.frete.servico),
        modalidade: '1', // Por conta do destinatário
        valor_frete: pedido.frete.preco,
        peso_bruto: pedido.itens.length * 0.2
      }
    };

    const resultado = await this.chamarApi('produtos/pedido', 'IncluirPedido', pedidoOmie);

    if (resultado.success) {
      // Emitir NF-e automaticamente se configurado
      await this.emitirNFe(resultado.data.codigo_pedido);
    }

    return resultado;
  }

  // Criar ou obter cliente
  async obterOuCriarCliente(cliente) {
    // Primeiro, tentar buscar por CPF
    const busca = await this.chamarApi('geral/clientes', 'ConsultarCliente', {
      codigo_cliente_omie: cliente.cpf.replace(/[^0-9]/g, '')
    });

    if (busca.success) {
      return busca.data.codigo_cliente_omie;
    }

    // Se não encontrou, criar novo cliente
    const clienteOmie = {
      codigo_cliente_integracao: cliente.cpf.replace(/[^0-9]/g, ''),
      razao_social: cliente.nome,
      nome_fantasia: cliente.nome,
      cnpj_cpf: cliente.cpf.replace(/[^0-9]/g, ''),
      telefone1_ddd: cliente.telefone.substring(1, 3),
      telefone1_numero: cliente.telefone.substring(3),
      email: cliente.email,
      endereco: cliente.endereco.endereco,
      endereco_numero: cliente.endereco.numero,
      bairro: cliente.endereco.bairro,
      cidade: cliente.endereco.cidade,
      cep: cliente.endereco.cep.replace(/[^0-9]/g, ''),
      estado: cliente.endereco.estado,
      complemento: cliente.endereco.complemento || '',
      pessoa_fisica: 'S',
      contribuinte: 'N',
      cliente_ativo: 'S'
    };

    const resultado = await this.chamarApi('geral/clientes', 'IncluirCliente', clienteOmie);
    return resultado.success ? resultado.data.codigo_cliente_omie : null;
  }

  // Emitir NF-e
  async emitirNFe(codigoPedido) {
    try {
      const nfe = {
        codigo_pedido: codigoPedido,
        gerar_nfe: 'S',
        enviar_email: 'S'
      };

      return await this.chamarApi('produtos/nfe', 'GerarNFePedido', nfe);
    } catch (error) {
      console.error('Erro ao emitir NF-e:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar estoque
  async atualizarEstoque(produtoId, quantidade, tipo = 'saida') {
    const movimentacao = {
      codigo_produto: produtoId,
      quantidade: quantidade,
      tipo_operacao: tipo === 'entrada' ? 'E' : 'S',
      data_movimento: new Date().toISOString().split('T')[0],
      observacoes: `Movimentação automática do e-commerce - ${tipo}`,
      codigo_local_estoque: 1
    };

    return await this.chamarApi('estoque/movimentacao', 'IncluirMovimento', movimentacao);
  }

  // Consultar saldo de estoque
  async consultarEstoque(produtoId) {
    const consulta = {
      codigo_produto: produtoId,
      codigo_local_estoque: 1
    };

    return await this.chamarApi('estoque/saldo', 'ConsultarSaldo', consulta);
  }

  // Relatório de vendas
  async obterRelatorioVendas(dataInicio, dataFim) {
    const filtro = {
      apenas_importado_api: 'N',
      data_de: dataInicio,
      data_ate: dataFim,
      etapa: '50', // Apenas pedidos faturados
      pagina: 1,
      registros_por_pagina: 100
    };

    return await this.chamarApi('produtos/pedido', 'ListarPedidos', filtro);
  }

  // Obter código da transportadora
  obterCodigoTransportadora(servico) {
    const transportadoras = {
      'correios': '001',
      'loggi': '002',
      'frenet': '003'
    };
    return transportadoras[servico] || '001';
  }

  // Webhooks para sincronização reversa
  async processarWebhookEstoque(dados) {
    // Atualizar estoque no e-commerce quando houver alteração no Omie
    try {
      // Implementar lógica de sincronização reversa
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = OmieService;
