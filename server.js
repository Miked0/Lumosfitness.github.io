
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database simulado (em produção seria PostgreSQL)
let produtos = [
  {
    id: 1,
    nome: "Legging High Power Turquesa",
    preco: 189.90,
    precoOriginal: 239.90,
    categoria: "Leggings",
    imagem: "/images/legging-turquesa.jpg",
    descricao: "Legging de alta compressão com tecnologia dry-fit exclusiva",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Turquesa", "Preto", "Rosa"],
    estoque: 25,
    ativo: true,
    destaque: true,
    omieId: "LG001"
  },
  {
    id: 2,
    nome: "Top Force Preto",
    preco: 159.90,
    categoria: "Tops",
    imagem: "/images/top-preto.jpg",
    descricao: "Top esportivo com suporte médio e alças ajustáveis",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Branco", "Rosa"],
    estoque: 18,
    ativo: true,
    omieId: "TP001"
  },
  {
    id: 3,
    nome: "Conjunto Boss Completo",
    preco: 349.90,
    precoOriginal: 429.90,
    categoria: "Conjuntos",
    imagem: "/images/conjunto-boss.jpg",
    descricao: "Conjunto legging + top com modelagem exclusiva",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto/Rosa", "Azul/Branco"],
    estoque: 12,
    ativo: true,
    destaque: true,
    omieId: "CJ001"
  },
  {
    id: 4,
    nome: "Macaquinho Athleisure",
    preco: 269.90,
    categoria: "Macaquinhos",
    imagem: "/images/macaquinho.jpg",
    descricao: "Peça versátil para treino e uso casual",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Nude", "Verde"],
    estoque: 8,
    ativo: true,
    omieId: "MC001"
  },
  {
    id: 5,
    nome: "Short Essence Alta Compressão",
    preco: 189.90,
    categoria: "Shorts",
    imagem: "/images/short-compressao.jpg",
    descricao: "Short com compressão estratégica e bolsos laterais",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Cinza", "Rosa"],
    estoque: 20,
    ativo: true,
    omieId: "SH001"
  },
  {
    id: 6,
    nome: "Calça Wide Leg Comfort",
    preco: 249.90,
    categoria: "Calças",
    imagem: "/images/calca-wide.jpg",
    descricao: "Calça confortável para o dia a dia e yoga",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Bege", "Marinho"],
    estoque: 15,
    ativo: true,
    omieId: "CL001"
  }
];

let pedidos = [];
let usuarios = [];
let carrinhos = {};

// ==================== ROTAS DE PRODUTOS ====================
app.get('/api/produtos', (req, res) => {
  const { categoria, busca, destaque } = req.query;

  let produtosFiltrados = produtos.filter(p => p.ativo);

  if (categoria) {
    produtosFiltrados = produtosFiltrados.filter(p => 
      p.categoria.toLowerCase() === categoria.toLowerCase()
    );
  }

  if (busca) {
    produtosFiltrados = produtosFiltrados.filter(p =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase())
    );
  }

  if (destaque === 'true') {
    produtosFiltrados = produtosFiltrados.filter(p => p.destaque);
  }

  res.json({
    success: true,
    data: produtosFiltrados,
    total: produtosFiltrados.length
  });
});

app.get('/api/produtos/:id', (req, res) => {
  const produto = produtos.find(p => p.id === parseInt(req.params.id));

  if (!produto) {
    return res.status(404).json({
      success: false,
      message: 'Produto não encontrado'
    });
  }

  res.json({
    success: true,
    data: produto
  });
});

// ==================== CARRINHO DE COMPRAS ====================
app.get('/api/carrinho/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const carrinho = carrinhos[sessionId] || { itens: [], total: 0 };

  res.json({
    success: true,
    data: carrinho
  });
});

app.post('/api/carrinho/:sessionId/adicionar', (req, res) => {
  const { sessionId } = req.params;
  const { produtoId, quantidade, tamanho, cor } = req.body;

  const produto = produtos.find(p => p.id === produtoId);
  if (!produto) {
    return res.status(404).json({
      success: false,
      message: 'Produto não encontrado'
    });
  }

  if (!carrinhos[sessionId]) {
    carrinhos[sessionId] = { itens: [], total: 0 };
  }

  const itemExistente = carrinhos[sessionId].itens.find(item =>
    item.produtoId === produtoId && item.tamanho === tamanho && item.cor === cor
  );

  if (itemExistente) {
    itemExistente.quantidade += quantidade;
  } else {
    carrinhos[sessionId].itens.push({
      produtoId,
      nome: produto.nome,
      preco: produto.preco,
      quantidade,
      tamanho,
      cor,
      imagem: produto.imagem
    });
  }

  // Recalcular total
  carrinhos[sessionId].total = carrinhos[sessionId].itens.reduce((total, item) => {
    return total + (item.preco * item.quantidade);
  }, 0);

  res.json({
    success: true,
    data: carrinhos[sessionId],
    message: 'Produto adicionado ao carrinho'
  });
});

app.delete('/api/carrinho/:sessionId/remover/:produtoId', (req, res) => {
  const { sessionId, produtoId } = req.params;
  const { tamanho, cor } = req.query;

  if (!carrinhos[sessionId]) {
    return res.status(404).json({
      success: false,
      message: 'Carrinho não encontrado'
    });
  }

  carrinhos[sessionId].itens = carrinhos[sessionId].itens.filter(item =>
    !(item.produtoId === parseInt(produtoId) && item.tamanho === tamanho && item.cor === cor)
  );

  // Recalcular total
  carrinhos[sessionId].total = carrinhos[sessionId].itens.reduce((total, item) => {
    return total + (item.preco * item.quantidade);
  }, 0);

  res.json({
    success: true,
    data: carrinhos[sessionId],
    message: 'Item removido do carrinho'
  });
});

// ==================== CÁLCULO DE FRETE ====================
app.post('/api/frete/calcular', async (req, res) => {
  const { cep, produtos: itensPedido } = req.body;

  // Simulação de cálculo de frete (integração com Correios/Loggi)
  const pesoTotal = itensPedido.reduce((peso, item) => peso + (item.quantidade * 0.2), 0);

  const opcoesEntrega = [
    {
      nome: 'PAC',
      preco: 15.50,
      prazo: '8-12 dias úteis',
      servico: 'correios'
    },
    {
      nome: 'SEDEX',
      preco: 25.80,
      prazo: '3-5 dias úteis',
      servico: 'correios'
    },
    {
      nome: 'Loggi Express',
      preco: 35.00,
      prazo: '1-2 dias úteis',
      servico: 'loggi'
    }
  ];

  // Frete grátis acima de R$ 250
  const valorPedido = itensPedido.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  if (valorPedido >= 250) {
    opcoesEntrega.push({
      nome: 'Frete Grátis',
      preco: 0,
      prazo: '5-8 dias úteis',
      servico: 'promocional'
    });
  }

  res.json({
    success: true,
    data: {
      cep,
      opcoes: opcoesEntrega,
      pesoTotal,
      valorPedido
    }
  });
});

// ==================== CHECKOUT E PAGAMENTOS ====================
app.post('/api/checkout/processar', async (req, res) => {
  const { sessionId, cliente, endereco, pagamento, frete } = req.body;

  const carrinho = carrinhos[sessionId];
  if (!carrinho || carrinho.itens.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Carrinho vazio'
    });
  }

  // Criar pedido
  const pedido = {
    id: Date.now(),
    cliente,
    endereco,
    itens: carrinho.itens,
    subtotal: carrinho.total,
    frete: frete.preco,
    total: carrinho.total + frete.preco,
    pagamento,
    status: 'pendente',
    dataCriacao: new Date(),
    omieId: null
  };

  pedidos.push(pedido);

  // Simular integração com Mercado Pago
  const pagamentoMercadoPago = await processarPagamentoMP(pedido);

  // Simular integração com Omie ERP
  const omieResponse = await sincronizarOmie(pedido);

  // Limpar carrinho
  delete carrinhos[sessionId];

  res.json({
    success: true,
    data: {
      pedido,
      pagamento: pagamentoMercadoPago,
      omie: omieResponse
    },
    message: 'Pedido criado com sucesso'
  });
});

// ==================== INTEGRAÇÃO MERCADO PAGO ====================
async function processarPagamentoMP(pedido) {
  // Simulação da integração com Mercado Pago
  return new Promise((resolve) => {
    setTimeout(() => {
      if (pedido.pagamento.metodo === 'pix') {
        resolve({
          status: 'pending',
          pixCode: '00020126360014br.gov.bcb.pix0114+5511999999999052040000530398654041.005802BR5925LUMOS MODA FITNESS LTDA6009SAO PAULO62070503***6304XXXX',
          qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          expirationDate: new Date(Date.now() + 30 * 60 * 1000) // 30 min
        });
      } else {
        resolve({
          status: 'approved',
          transactionId: 'MP' + Date.now(),
          installments: pedido.pagamento.parcelas || 1
        });
      }
    }, 1000);
  });
}

// ==================== INTEGRAÇÃO OMIE ERP ====================
async function sincronizarOmie(pedido) {
  // Simulação da integração com Omie ERP
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        pedidoId: 'OMIE' + Date.now(),
        nfeStatus: 'processando',
        estoqueAtualizado: true
      });
    }, 2000);
  });
}

// ==================== PAINEL ADMINISTRATIVO ====================
app.get('/api/admin/vendas', (req, res) => {
  const vendas = pedidos.map(pedido => ({
    id: pedido.id,
    cliente: pedido.cliente.nome,
    total: pedido.total,
    status: pedido.status,
    data: pedido.dataCriacao,
    itens: pedido.itens.length
  }));

  const resumo = {
    totalVendas: vendas.length,
    faturamento: vendas.reduce((total, venda) => total + venda.total, 0),
    ticketMedio: vendas.length > 0 ? vendas.reduce((total, venda) => total + venda.total, 0) / vendas.length : 0
  };

  res.json({
    success: true,
    data: {
      vendas,
      resumo
    }
  });
});

app.get('/api/admin/estoque', (req, res) => {
  const estoque = produtos.map(produto => ({
    id: produto.id,
    nome: produto.nome,
    categoria: produto.categoria,
    estoque: produto.estoque,
    preco: produto.preco,
    ativo: produto.ativo,
    alertaEstoqueBaixo: produto.estoque < 5
  }));

  res.json({
    success: true,
    data: estoque
  });
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Lumos API rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
