/**
 * Firebase Functions para Lumos Fitness
 * SID - NEW AGE | Excelência e Inovação
 * Michael Douglas - Principal Software Architect
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const {onValueCreated, onValueWritten} = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const axios = require('axios');

// Inicializar Firebase Admin
admin.initializeApp();

// Configuração global para controle de custos
setGlobalOptions({ maxInstances: 10 });

// ✅ API LUMOS FITNESS - Produtos
exports.api = onRequest({cors: true}, async (req, res) => {
  try {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }

    logger.info(`🔄 SID API: ${req.method} ${req.path}`, {structuredData: true});

    // Rotas da API
    if (req.path === '/produtos' && req.method === 'GET') {
      const snapshot = await admin.database().ref('/produtos').once('value');
      const produtos = snapshot.val() || {};
      
      res.json({
        success: true,
        data: Object.values(produtos),
        total: Object.keys(produtos).length,
        timestamp: new Date().toISOString(),
        source: 'SID Firebase Functions'
      });
      
    } else if (req.path === '/produtos' && req.method === 'POST') {
      const novoProduto = req.body;
      const produtoRef = admin.database().ref('/produtos').push();
      
      await produtoRef.set({
        ...novoProduto,
        id: produtoRef.key,
        criadoEm: admin.database.ServerValue.TIMESTAMP,
        marca: 'Lumos Fitness'
      });
      
      res.json({
        success: true,
        message: 'Produto criado com sucesso',
        id: produtoRef.key
      });
      
    } else if (req.path.startsWith('/carrinho/') && req.method === 'GET') {
      const sessionId = req.path.split('/')[2];
      const snapshot = await admin.database().ref(`/carrinhos/${sessionId}`).once('value');
      const carrinho = snapshot.val() || { itens: {}, total: 0 };
      
      res.json({
        success: true,
        data: carrinho
      });
      
    } else if (req.path === '/health') {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'Lumos Fitness API - SID'
      });
      
    } else {
      res.status(404).json({
        success: false,
        error: 'Endpoint não encontrado',
        availableEndpoints: ['/produtos', '/carrinho/{sessionId}', '/health']
      });
    }
    
  } catch (error) {
    logger.error('❌ SID API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// ✅ PROCESSAR PEDIDOS AUTOMÁTICAMENTE
exports.processarPedido = onValueCreated("/pedidos/{pedidoId}", async (event) => {
  const pedidoId = event.params.pedidoId;
  const pedido = event.data.val();
  
  logger.info(`🛒 SID: Novo pedido criado - ${pedidoId}`, {pedido});
  
  try {
    // 1. Atualizar estoque dos produtos
    const updates = {};
    
    if (pedido.itens) {
      for (const item of pedido.itens) {
        const produtoRef = `/produtos/${item.produtoId}/estoque`;
        const snapshot = await admin.database().ref(produtoRef).once('value');
        const estoqueAtual = snapshot.val() || 0;
        
        if (estoqueAtual >= item.quantidade) {
          updates[produtoRef] = estoqueAtual - item.quantidade;
        }
      }
    }
    
    // Aplicar atualizações de estoque
    if (Object.keys(updates).length > 0) {
      await admin.database().ref().update(updates);
      logger.info(`📦 SID: Estoque atualizado para pedido ${pedidoId}`);
    }
    
    // 2. Enviar notificação (simulado)
    await enviarNotificacaoPedido(pedido, pedidoId);
    
    // 3. Integração com Mercado Pago (simulado)
    await integrarMercadoPago(pedido, pedidoId);
    
    // 4. Atualizar status do pedido
    await admin.database().ref(`/pedidos/${pedidoId}`).update({
      status: 'processando',
      processadoEm: admin.database.ServerValue.TIMESTAMP,
      processadoPor: 'SID Firebase Functions'
    });
    
    logger.info(`✅ SID: Pedido ${pedidoId} processado com sucesso`);
    
  } catch (error) {
    logger.error(`❌ SID: Erro ao processar pedido ${pedidoId}:`, error);
    
    await admin.database().ref(`/pedidos/${pedidoId}`).update({
      status: 'erro',
      erro: error.message,
      erroEm: admin.database.ServerValue.TIMESTAMP
    });
  }
});

// ✅ MONITORAR CARRINHO ABANDONADO
exports.monitorarCarrinhoAbandonado = onValueWritten("/carrinhos/{sessionId}", async (event) => {
  const sessionId = event.params.sessionId;
  const carrinho = event.data.after.val();
  
  if (!carrinho || !carrinho.itens) return;
  
  // Verificar se carrinho foi abandonado (sem atividade por 30 minutos)
  const agora = Date.now();
  const ultimaAtualizacao = carrinho.atualizadoEm || agora;
  const tempoAbandonado = agora - ultimaAtualizacao;
  
  if (tempoAbandonado > 30 * 60 * 1000) { // 30 minutos
    logger.info(`🛒 SID: Carrinho abandonado detectado - ${sessionId}`);
    
    // Aqui você pode implementar:
    // - Envio de email de lembrete
    // - Push notification
    // - Análise de abandono
    
    await admin.database().ref(`/analytics/carrinhos-abandonados/${sessionId}`).set({
      sessionId,
      itens: carrinho.itens,
      total: carrinho.total,
      abandonadoEm: admin.database.ServerValue.TIMESTAMP,
      fonte: 'SID Analytics'
    });
  }
});

// ✅ GERAR RELATÓRIOS AUTOMÁTICOS
exports.gerarRelatorioVendas = onRequest({cors: true}, async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    
    // Buscar todos os pedidos
    const pedidosSnapshot = await admin.database().ref('/pedidos').once('value');
    const pedidos = pedidosSnapshot.val() || {};
    
    // Buscar produtos para análise
    const produtosSnapshot = await admin.database().ref('/produtos').once('value');
    const produtos = produtosSnapshot.val() || {};
    
    // Calcular métricas
    const relatorio = {
      periodo: {
        inicio: new Date().toISOString(),
        geradoEm: new Date().toISOString()
      },
      vendas: {
        totalPedidos: Object.keys(pedidos).length,
        faturamento: Object.values(pedidos).reduce((total, pedido) => total + (pedido.total || 0), 0),
        ticketMedio: 0
      },
      produtos: {
        totalProdutos: Object.keys(produtos).length,
        estoqueTotal: Object.values(produtos).reduce((total, produto) => total + (produto.estoque || 0), 0),
        produtosMaisVendidos: calcularProdutosMaisVendidos(pedidos, produtos)
      },
      status: {
        pendentes: Object.values(pedidos).filter(p => p.status === 'pendente').length,
        processando: Object.values(pedidos).filter(p => p.status === 'processando').length,
        concluidos: Object.values(pedidos).filter(p => p.status === 'concluido').length
      },
      fonte: 'SID Analytics Dashboard'
    };
    
    // Calcular ticket médio
    if (relatorio.vendas.totalPedidos > 0) {
      relatorio.vendas.ticketMedio = relatorio.vendas.faturamento / relatorio.vendas.totalPedidos;
    }
    
    res.json({
      success: true,
      data: relatorio
    });
    
    logger.info('📊 SID: Relatório de vendas gerado');
    
  } catch (error) {
    logger.error('❌ SID: Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar relatório'
    });
  }
});

// ✅ WEBHOOK MERCADO PAGO
exports.webhookMercadoPago = onRequest({cors: true}, async (req, res) => {
  try {
    logger.info('💳 SID: Webhook Mercado Pago recebido', {body: req.body});
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Aqui você implementaria a lógica de:
      // 1. Consultar status do pagamento no MP
      // 2. Atualizar status do pedido no Firebase
      // 3. Enviar confirmação para cliente
      
      logger.info(`💰 SID: Pagamento processado - ${paymentId}`);
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    logger.error('❌ SID: Erro no webhook MP:', error);
    res.status(500).send('Error');
  }
});

// ✅ HEALTH CHECK AVANÇADO
exports.healthCheck = onRequest({cors: true}, async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    
    // Verificar conectividade com Firebase
    const testRef = admin.database().ref('/.info/connected');
    const snapshot = await testRef.once('value');
    const connected = snapshot.val();
    
    // Verificar alguns dados básicos
    const produtosCount = (await admin.database().ref('/produtos').once('value')).numChildren();
    const pedidosCount = (await admin.database().ref('/pedidos').once('value')).numChildren();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        firebase: connected ? 'connected' : 'disconnected',
        database: 'operational',
        functions: 'operational'
      },
      stats: {
        produtos: produtosCount,
        pedidos: pedidosCount,
        uptime: process.uptime()
      },
      version: '1.0.0',
      desenvolvido: 'SID - NEW AGE',
      arquiteto: 'Michael Douglas'
    };
    
    res.json(health);
    
  } catch (error) {
    logger.error('❌ SID: Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== FUNÇÕES AUXILIARES ==========

async function enviarNotificacaoPedido(pedido, pedidoId) {
  try {
    // Simulação de envio de email/SMS
    logger.info(`📧 SID: Notificação enviada para ${pedido.cliente?.email} - Pedido ${pedidoId}`);
    
    // Aqui você integraria com:
    // - SendGrid para email
    // - Twilio para SMS
    // - Push notifications
    
    return true;
  } catch (error) {
    logger.error('❌ SID: Erro ao enviar notificação:', error);
    return false;
  }
}

async function integrarMercadoPago(pedido, pedidoId) {
  try {
    // Simulação de integração com Mercado Pago
    logger.info(`💳 SID: Processando pagamento MP para pedido ${pedidoId}`);
    
    // Aqui você integraria com a API do Mercado Pago:
    // - Criar preferência de pagamento
    // - Processar PIX
    // - Validar cartão de crédito
    
    return { success: true, paymentId: `mp_${Date.now()}` };
  } catch (error) {
    logger.error('❌ SID: Erro na integração MP:', error);
    return { success: false, error: error.message };
  }
}

function calcularProdutosMaisVendidos(pedidos, produtos) {
  const vendas = {};
  
  Object.values(pedidos).forEach(pedido => {
    if (pedido.itens) {
      pedido.itens.forEach(item => {
        if (!vendas[item.produtoId]) {
          vendas[item.produtoId] = {
            produtoId: item.produtoId,
            nome: item.nome,
            quantidadeVendida: 0,
            receitaTotal: 0
          };
        }
        vendas[item.produtoId].quantidadeVendida += item.quantidade || 0;
        vendas[item.produtoId].receitaTotal += (item.preco * item.quantidade) || 0;
      });
    }
  });
  
  return Object.values(vendas)
    .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida)
    .slice(0, 5); // Top 5 produtos
}

// ✅ FUNÇÃO DE LIMPEZA (executar periodicamente)
exports.limpezaDados = onRequest({cors: true}, async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    
    // Limpar carrinhos antigos (mais de 7 dias)
    const carrinhos = await admin.database().ref('/carrinhos').once('value');
    const agora = Date.now();
    const setedias = 7 * 24 * 60 * 60 * 1000;
    
    let removidos = 0;
    
    if (carrinhos.exists()) {
      const updates = {};
      
      carrinhos.forEach(child => {
        const carrinho = child.val();
        const ultimaAtualizacao = carrinho.atualizadoEm || carrinho.criadoEm || 0;
        
        if (agora - ultimaAtualizacao > setedias) {
          updates[`/carrinhos/${child.key}`] = null;
          removidos++;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
      }
    }
    
    logger.info(`🧹 SID: Limpeza concluída - ${removidos} carrinhos removidos`);
    
    res.json({
      success: true,
      message: `Limpeza concluída`,
      carrinhos_removidos: removidos,
      executado_em: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ SID: Erro na limpeza:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

logger.info('🚀 SID: Firebase Functions Lumos Fitness carregadas com sucesso!');
