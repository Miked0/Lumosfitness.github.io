/**
 * Script de Migração Firebase - Lumos Fitness
 * SID - NEW AGE | Michael Douglas - Principal Software Architect
 * 
 * Este script migra dados existentes para o Firebase e configura o ambiente
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, serverTimestamp } = require('firebase/database');

// ✅ Configuração Firebase Lumos Fitness
const firebaseConfig = {
  apiKey: "AIzaSyDJ9_XRz7kL8vN2QgF5MwP3Hx6KjY8ZrTc",
  authDomain: "lumos-fitness.firebaseapp.com",
  databaseURL: "https://lumos-fitness-default-rtdb.firebaseio.com/",
  projectId: "lumos-fitness",
  storageBucket: "lumos-fitness.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345",
  measurementId: "G-ABC123DEF4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 📦 Dados dos produtos Lumos Fitness
const produtosLumos = [
  {
    id: 1,
    nome: "Legging High Power Turquesa",
    preco: 189.90,
    precoOriginal: 239.90,
    categoria: "Leggings",
    descricao: "Legging de alta compressão com tecnologia dry-fit exclusiva",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Turquesa", "Preto", "Rosa"],
    estoque: 25,
    destaque: true,
    marca: 'Lumos Fitness',
    ativo: true,
    imagem: "/images/legging-turquesa.jpg",
    peso: 0.3,
    dimensoes: { altura: 30, largura: 25, profundidade: 2 },
    materiais: ["Poliamida", "Elastano"],
    cuidados: "Lavar à mão ou máquina em água fria"
  },
  {
    id: 2,
    nome: "Top Force Preto",
    preco: 159.90,
    categoria: "Tops",
    descricao: "Top esportivo com suporte médio e alças ajustáveis",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Branco", "Rosa"],
    estoque: 18,
    destaque: false,
    marca: 'Lumos Fitness',
    ativo: true,
    imagem: "/images/top-preto.jpg",
    peso: 0.2,
    dimensoes: { altura: 25, largura: 20, profundidade: 1 },
    materiais: ["Poliamida", "Elastano"],
    cuidados: "Lavar à mão ou máquina em água fria"
  },
  {
    id: 3,
    nome: "Conjunto Boss Completo",
    preco: 349.90,
    precoOriginal: 429.90,
    categoria: "Conjuntos",
    descricao: "Conjunto legging + top com modelagem exclusiva",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto/Rosa", "Azul/Branco"],
    estoque: 12,
    destaque: true,
    marca: 'Lumos Fitness',
    ativo: true,
    imagem: "/images/conjunto-boss.jpg",
    peso: 0.5,
    dimensoes: { altura: 35, largura: 30, profundidade: 3 },
    materiais: ["Poliamida", "Elastano"],
    cuidados: "Lavar à mão ou máquina em água fria"
  },
  {
    id: 4,
    nome: "Macaquinho Athleisure",
    preco: 269.90,
    categoria: "Macaquinhos",
    descricao: "Peça versátil para treino e uso casual",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Nude", "Verde"],
    estoque: 8,
    destaque: false,
    marca: 'Lumos Fitness',
    ativo: true,
    imagem: "/images/macaquinho.jpg",
    peso: 0.4,
    dimensoes: { altura: 32, largura: 28, profundidade: 2 },
    materiais: ["Poliamida", "Elastano"],
    cuidados: "Lavar à mão ou máquina em água fria"
  },
  {
    id: 5,
    nome: "Short Essence Alta Compressão",
    preco: 189.90,
    categoria: "Shorts",
    descricao: "Short com compressão estratégica e bolsos laterais",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Cinza", "Rosa"],
    estoque: 20,
    destaque: false,
    marca: 'Lumos Fitness',
    ativo: true,
    imagem: "/images/short-compressao.jpg",
    peso: 0.25,
    dimensoes: { altura: 20, largura: 25, profundidade: 1 },
    materiais: ["Poliamida", "Elastano"],
    cuidados: "Lavar à mão ou máquina em água fria"
  },
  {
    id: 6,
    nome: "Calça Wide Leg Comfort",
    preco: 249.90,
    categoria: "Calças",
    descricao: "Calça confortável para o dia a dia e yoga",
    tamanhos: ["PP", "P", "M", "G", "GG"],
    cores: ["Preto", "Bege", "Marinho"],
    estoque: 15,
    destaque: false,
    marca: 'Lumos Fitness',
    ativo: true,
    imagem: "/images/calca-wide.jpg",
    peso: 0.45,
    dimensoes: { altura: 40, largura: 30, profundidade: 3 },
    materiais: ["Algodão", "Poliamida", "Elastano"],
    cuidados: "Lavar à mão ou máquina em água fria"
  }
];

// 🏷️ Categorias
const categoriasLumos = {
  1: { nome: "Leggings", ativo: true, ordem: 1, icone: "👖" },
  2: { nome: "Tops", ativo: true, ordem: 2, icone: "👕" },
  3: { nome: "Conjuntos", ativo: true, ordem: 3, icone: "👔" },
  4: { nome: "Macaquinhos", ativo: true, ordem: 4, icone: "🩱" },
  5: { nome: "Shorts", ativo: true, ordem: 5, icone: "🩳" },
  6: { nome: "Calças", ativo: true, ordem: 6, icone: "👖" }
};

// 🏢 Configurações da empresa
const configuracoes = {
  empresa: {
    nome: "Lumos Moda Fitness",
    slogan: "Luz que inspira movimento",
    descricao: "Criamos peças que acompanham mulheres reais na rotina, no treino e na vida",
    email: "contato@lumosfitness.com",
    whatsapp: "(11) 99999-9999",
    instagram: "@lumosmodafitness",
    website: "https://lumosfitness.com",
    endereco: {
      rua: "Rua das Flores, 123",
      bairro: "Jardim Fitness",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01234-567"
    },
    cnpj: "12.345.678/0001-90",
    fundacao: "2024"
  },
  sistema: {
    versao: "1.0.0",
    desenvolvido: "SID - NEW AGE",
    arquiteto: "Michael Douglas",
    tecnologias: ["Firebase", "JavaScript", "HTML5", "CSS3"],
    publico: true,
    manutencao: false
  },
  ecommerce: {
    frete_gratis_acima: 250.00,
    desconto_primeira_compra: 10,
    cashback_ativo: true,
    cashback_percentual: 2,
    parcelamento_maximo: 12,
    metodos_pagamento: ["PIX", "Cartão de Crédito", "Boleto"]
  },
  analytics: {
    google_analytics: "G-ABC123DEF4",
    facebook_pixel: "123456789012345",
    hotjar: "1234567",
    ativo: true
  }
};

// 📊 Dados de demonstração para analytics
const dadosDemo = {
  depoimentos: {
    1: {
      nome: "Ana Silva",
      texto: "A qualidade das peças da Lumos é incrível! O caimento é perfeito e o tecido tem uma compressão ideal.",
      rating: 5,
      produto_id: 1,
      verificado: true,
      data: "2024-09-15"
    },
    2: {
      nome: "Mariana Costa",
      texto: "Uso tanto na academia quanto no trabalho. As peças são super versáteis e estilosas!",
      rating: 5,
      produto_id: 3,
      verificado: true,
      data: "2024-09-10"
    },
    3: {
      nome: "Júlia Santos",
      texto: "Marca brasileira de qualidade internacional. Recomendo para todas as amigas!",
      rating: 5,
      produto_id: 2,
      verificado: true,
      data: "2024-09-05"
    }
  },
  opcoes_frete: {
    pac: {
      nome: "PAC",
      preco: 15.50,
      prazo: "8-12 dias úteis",
      transportadora: "Correios",
      ativo: true
    },
    sedex: {
      nome: "SEDEX",
      preco: 25.80,
      prazo: "3-5 dias úteis",
      transportadora: "Correios",
      ativo: true
    },
    express: {
      nome: "Loggi Express",
      preco: 35.00,
      prazo: "1-2 dias úteis",
      transportadora: "Loggi",
      ativo: true,
      regioes: ["SP", "RJ", "MG"]
    }
  }
};

// 🚀 Função principal de migração
async function migrarDadosCompletos() {
  console.log('🚀 SID: Iniciando migração completa Lumos Fitness para Firebase');
  console.log('📅 Data:', new Date().toISOString());
  console.log('👨‍💻 Desenvolvido por: Michael Douglas - SID');
  
  try {
    // 1. Migrar produtos
    console.log('\n📦 Migrando produtos...');
    for (const produto of produtosLumos) {
      const produtoRef = ref(database, `produtos/${produto.id}`);
      await set(produtoRef, {
        ...produto,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });
      console.log(`  ✅ ${produto.nome}`);
    }
    
    // 2. Migrar categorias
    console.log('\n🏷️ Migrando categorias...');
    const categoriasRef = ref(database, 'categorias');
    await set(categoriasRef, {
      ...categoriasLumos,
      criadoEm: serverTimestamp()
    });
    console.log('  ✅ Categorias configuradas');
    
    // 3. Migrar configurações
    console.log('\n⚙️ Migrando configurações...');
    const configRef = ref(database, 'configuracoes');
    await set(configRef, {
      ...configuracoes,
      migradoEm: serverTimestamp(),
      migradoPor: 'Michael Douglas - SID'
    });
    console.log('  ✅ Configurações aplicadas');
    
    // 4. Migrar dados de demonstração
    console.log('\n💬 Migrando depoimentos...');
    const depoimentosRef = ref(database, 'depoimentos');
    await set(depoimentosRef, {
      ...dadosDemo.depoimentos,
      criadoEm: serverTimestamp()
    });
    console.log('  ✅ Depoimentos adicionados');
    
    console.log('\n🚚 Migrando opções de frete...');
    const freteRef = ref(database, 'opcoes_frete');
    await set(freteRef, {
      ...dadosDemo.opcoes_frete,
      criadoEm: serverTimestamp()
    });
    console.log('  ✅ Opções de frete configuradas');
    
    // 5. Criar estruturas iniciais
    console.log('\n🏗️ Criando estruturas iniciais...');
    
    // Estrutura para analytics
    const analyticsRef = ref(database, 'analytics');
    await set(analyticsRef, {
      "carrinhos-abandonados": {},
      "conversoes": {},
      "produtos-visualizados": {},
      "sessoes": {},
      "inicializadoEm": serverTimestamp()
    });
    console.log('  ✅ Analytics estruturado');
    
    // Estrutura para pedidos (vazia)
    const pedidosRef = ref(database, 'pedidos');
    await set(pedidosRef, {
      "inicializadoEm": serverTimestamp(),
      "total": 0
    });
    console.log('  ✅ Pedidos estruturado');
    
    // Estrutura para carrinhos (vazia)
    const carrinhosRef = ref(database, 'carrinhos');
    await set(carrinhosRef, {
      "inicializadoEm": serverTimestamp()
    });
    console.log('  ✅ Carrinhos estruturado');
    
    // 6. Dados de teste para desenvolvimento
    console.log('\n🧪 Criando dados de teste...');
    const testeRef = ref(database, 'teste');
    await set(testeRef, {
      "conexao": "ativa",
      "timestamp": serverTimestamp(),
      "status": "funcionando",
      "desenvolvedor": "Michael Douglas",
      "empresa": "SID - NEW AGE"
    });
    console.log('  ✅ Dados de teste criados');
    
    // 7. Log da migração
    const logRef = ref(database, 'logs/migracao');
    await set(logRef, {
      "executadoEm": serverTimestamp(),
      "desenvolvedor": "Michael Douglas",
      "empresa": "SID - NEW AGE",
      "versao": "1.0.0",
      "produtos_migrados": produtosLumos.length,
      "categorias_migradas": Object.keys(categoriasLumos).length,
      "status": "sucesso",
      "observacoes": "Migração completa com estruturas otimizadas"
    });
    
    console.log('\n🎉 SID: Migração completa finalizada com sucesso!');
    console.log('📊 Estatísticas:');
    console.log(`   • ${produtosLumos.length} produtos migrados`);
    console.log(`   • ${Object.keys(categoriasLumos).length} categorias criadas`);
    console.log(`   • ${Object.keys(dadosDemo.depoimentos).length} depoimentos adicionados`);
    console.log(`   • ${Object.keys(dadosDemo.opcoes_frete).length} opções de frete configuradas`);
    console.log('\n✅ Firebase Lumos Fitness está pronto para uso!');
    console.log('🔗 Acesse: https://console.firebase.google.com/project/lumos-fitness');
    console.log('\n🚀 Desenvolvido com excelência por SID - NEW AGE');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ SID: Erro na migração:', error);
    console.error('📝 Detalhes:', error.message);
    
    // Log do erro
    try {
      const erroRef = ref(database, 'logs/erros');
      await set(erroRef, {
        "erro": error.message,
        "stack": error.stack,
        "timestamp": serverTimestamp(),
        "operacao": "migracao_inicial"
      });
    } catch (logError) {
      console.error('Erro ao salvar log:', logError);
    }
    
    process.exit(1);
  }
}

// 🔍 Função de verificação
async function verificarMigracao() {
  console.log('🔍 Verificando migração...');
  
  try {
    const { get } = require('firebase/database');
    
    // Verificar produtos
    const produtosRef = ref(database, 'produtos');
    const produtosSnapshot = await get(produtosRef);
    console.log(`📦 Produtos: ${produtosSnapshot.exists() ? Object.keys(produtosSnapshot.val()).length : 0}`);
    
    // Verificar configurações
    const configRef = ref(database, 'configuracoes');
    const configSnapshot = await get(configRef);
    console.log(`⚙️ Configurações: ${configSnapshot.exists() ? 'OK' : 'ERRO'}`);
    
    console.log('✅ Verificação completa');
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

// Executar baseado em argumentos
const comando = process.argv[2];

switch (comando) {
  case 'verificar':
    verificarMigracao();
    break;
  case 'migrar':
  default:
    migrarDadosCompletos();
    break;
}

// Tratamento de saída
process.on('SIGINT', () => {
  console.log('\n⚠️ Migração interrompida pelo usuário');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Erro não tratado:', reason);
  process.exit(1);
});