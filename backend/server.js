
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Simulação de banco de dados em memória
let produtos = [
  {
    id: 1,
    nome: "Legging High Power",
    preco: 149.90,
    categoria: "Leggings",
    estoque: 50,
    descricao: "Legging de alta compressão com tecnologia dry-fit",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Azul", "Rosa"],
    ativo: true
  },
  {
    id: 2,
    nome: "Top Sport Comfort",
    preco: 89.90,
    categoria: "Tops", 
    estoque: 30,
    descricao: "Top esportivo com suporte médio e alças ajustáveis",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Branco", "Verde"],
    ativo: true
  }
];

let pedidos = [];
let usuarios = [];

// Rotas da API

// PRODUTOS
app.get('/api/produtos', (req, res) => {
  const { categoria, busca } = req.query;
  let produtosFiltrados = produtos.filter(p => p.ativo);

  if (categoria && categoria !== 'all') {
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

  res.json(produtosFiltrados);
});

app.get('/api/produtos/:id', (req, res) => {
  const produto = produtos.find(p => p.id === parseInt(req.params.id));
  if (!produto) {
    return res.status(404).json({ erro: 'Produto não encontrado' });
  }
  res.json(produto);
});

// CARRINHO E CHECKOUT
app.post('/api/checkout', (req, res) => {
  const { 
    cliente, 
    endereco, 
    itens, 
    pagamento, 
    frete 
  } = req.body;

  // Validar estoque
  for (let item of itens) {
    const produto = produtos.find(p => p.id === item.produtoId);
    if (!produto || produto.estoque < item.quantidade) {
      return res.status(400).json({
        erro: `Estoque insuficiente para ${produto?.nome || 'produto'}`
      });
    }
  }

  // Criar pedido
  const pedido = {
    id: pedidos.length + 1,
    cliente,
    endereco,
    itens,
    pagamento,
    frete,
    total: calcularTotal(itens, frete.valor),
    status: 'confirmado',
    dataPedido: new Date(),
    dataEntrega: calcularDataEntrega(endereco.cep)
  };

  // Atualizar estoque
  for (let item of itens) {
    const produto = produtos.find(p => p.id === item.produtoId);
    produto.estoque -= item.quantidade;
  }

  pedidos.push(pedido);

  // Simular integração com ERP
  integracaoERP(pedido);

  // Simular integração logística
  integracaoLogistica(pedido);

  res.json({ 
    sucesso: true, 
    pedidoId: pedido.id,
    total: pedido.total,
    dataEntrega: pedido.dataEntrega
  });
});

// CÁLCULO DE FRETE
app.post('/api/frete', (req, res) => {
  const { cep, itens } = req.body;

  // Simulação de cálculo de frete
  const peso = itens.reduce((total, item) => total + (item.quantidade * 0.2), 0);
  const distancia = calcularDistancia(cep);

  const opcoes = [
    {
      nome: 'PAC',
      prazo: '7-10 dias úteis',
      valor: Math.max(15.90, peso * 3.50 + distancia * 0.05)
    },
    {
      nome: 'SEDEX',
      prazo: '2-4 dias úteis', 
      valor: Math.max(25.90, peso * 5.50 + distancia * 0.08)
    }
  ];

  res.json(opcoes);
});

// INTEGRAÇÃO ERP (Simulada)
function integracaoERP(pedido) {
  console.log('🔄 Enviando pedido para ERP:', pedido.id);

  // Simular chamada para API do ERP
  const dadosERP = {
    pedidoId: pedido.id,
    clienteId: gerarClienteId(pedido.cliente),
    itens: pedido.itens.map(item => ({
      codigoProduto: `SKU${item.produtoId.toString().padStart(4, '0')}`,
      quantidade: item.quantidade,
      preco: item.preco
    })),
    valorTotal: pedido.total,
    formaPagamento: pedido.pagamento.metodo,
    observacoes: `Pedido e-commerce - ${new Date().toISOString()}`
  };

  // Aqui seria a integração real com ERP via API REST/SOAP
  console.log('✅ Pedido integrado ao ERP:', dadosERP);

  return dadosERP;
}

// INTEGRAÇÃO LOGÍSTICA (Simulada)
function integracaoLogistica(pedido) {
  console.log('🚚 Integrando com transportadora:', pedido.id);

  const dadosLogistica = {
    numeroRastreio: gerarCodigoRastreio(),
    pedidoId: pedido.id,
    destinatario: pedido.cliente,
    endereco: pedido.endereco,
    tipoFrete: pedido.frete.nome,
    prazoEntrega: pedido.frete.prazo,
    observacoes: 'Produtos frágeis - manuseio cuidadoso'
  };

  // Aqui seria a integração real com API da transportadora
  console.log('✅ Pedido enviado para logística:', dadosLogistica);

  return dadosLogistica;
}

// RELATÓRIOS E ADMIN
app.get('/api/admin/relatorio-vendas', (req, res) => {
  const { dataInicio, dataFim } = req.query;

  let pedidosFiltrados = pedidos;
  if (dataInicio && dataFim) {
    pedidosFiltrados = pedidos.filter(p => {
      const dataPedido = new Date(p.dataPedido);
      return dataPedido >= new Date(dataInicio) && dataPedido <= new Date(dataFim);
    });
  }

  const relatorio = {
    totalPedidos: pedidosFiltrados.length,
    faturamento: pedidosFiltrados.reduce((total, p) => total + p.total, 0),
    ticketMedio: pedidosFiltrados.length > 0 ? 
      pedidosFiltrados.reduce((total, p) => total + p.total, 0) / pedidosFiltrados.length : 0,
    produtosMaisVendidos: calcularProdutosMaisVendidos(pedidosFiltrados)
  };

  res.json(relatorio);
});

app.get('/api/admin/estoque', (req, res) => {
  const estoque = produtos.map(p => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    estoque: p.estoque,
    estoqueMinimo: 10,
    alerta: p.estoque <= 10
  }));

  res.json(estoque);
});

// FUNÇÕES AUXILIARES
function calcularTotal(itens, valorFrete) {
  const subtotal = itens.reduce((total, item) => 
    total + (item.preco * item.quantidade), 0
  );
  return subtotal + valorFrete;
}

function calcularDataEntrega(cep) {
  const diasUteis = calcularDistancia(cep) > 500 ? 7 : 3;
  const dataEntrega = new Date();
  dataEntrega.setDate(dataEntrega.getDate() + diasUteis);
  return dataEntrega;
}

function calcularDistancia(cep) {
  // Simulação baseada no CEP
  const numero = parseInt(cep.replace(/\D/g, ''));
  return Math.floor(Math.random() * 1000) + 100;
}

function gerarClienteId(cliente) {
  return `CLI${Date.now()}`;
}

function gerarCodigoRastreio() {
  return `LM${Date.now()}BR`;
}

function calcularProdutosMaisVendidos(pedidos) {
  const vendas = {};

  pedidos.forEach(pedido => {
    pedido.itens.forEach(item => {
      const produto = produtos.find(p => p.id === item.produtoId);
      if (produto) {
        vendas[produto.nome] = (vendas[produto.nome] || 0) + item.quantidade;
      }
    });
  });

  return Object.entries(vendas)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([nome, quantidade]) => ({ nome, quantidade }));
}

// INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api`);
});

module.exports = app;

