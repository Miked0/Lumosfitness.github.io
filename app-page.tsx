'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Truck, Shield, Award, User, Menu, X } from 'lucide-react';
import Image from 'next/image';

interface Produto {
  id: number;
  nome: string;
  preco: number;
  precoOriginal?: number;
  categoria: string;
  imagem: string;
  descricao: string;
  tamanhos: string[];
  cores: string[];
  estoque: number;
  destaque?: boolean;
}

interface ItemCarrinho {
  produtoId: number;
  nome: string;
  preco: number;
  quantidade: number;
  tamanho: string;
  cor: string;
  imagem: string;
}

export default function HomePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [menuAberto, setMenuAberto] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const response = await fetch('/api/produtos');
      const data = await response.json();
      setProdutos(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarAoCarrinho = async (produto: Produto, tamanho: string, cor: string) => {
    try {
      const sessionId = 'user_session_' + Date.now();
      const response = await fetch(`/api/carrinho/${sessionId}/adicionar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          produtoId: produto.id,
          quantidade: 1,
          tamanho,
          cor
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCarrinho(data.data.itens);
        alert('Produto adicionado ao carrinho!');
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lumos-cream">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-lumos-turquesa"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lumos-cream">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-montserrat font-bold text-lumos-turquesa">
                LUMOS
              </h1>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#home" className="text-gray-900 hover:text-lumos-turquesa px-3 py-2 text-sm font-medium">
                  Início
                </a>
                <a href="#produtos" className="text-gray-900 hover:text-lumos-turquesa px-3 py-2 text-sm font-medium">
                  Produtos
                </a>
                <a href="#sobre" className="text-gray-900 hover:text-lumos-turquesa px-3 py-2 text-sm font-medium">
                  Sobre
                </a>
                <a href="#contato" className="text-gray-900 hover:text-lumos-turquesa px-3 py-2 text-sm font-medium">
                  Contato
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-lumos-turquesa">
                <ShoppingCart size={24} />
                {carrinho.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-lumos-rosa text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {carrinho.length}
                  </span>
                )}
              </button>
              <button className="p-2 text-gray-600 hover:text-lumos-turquesa">
                <User size={24} />
              </button>
              <button 
                className="md:hidden p-2 text-gray-600"
                onClick={() => setMenuAberto(!menuAberto)}
              >
                {menuAberto ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative bg-gradient-to-r from-lumos-turquesa to-lumos-rosa text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h2 
              className="text-4xl md:text-6xl font-bebas mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              LUZ QUE INSPIRA MOVIMENTO
            </motion.h2>
            <motion.p 
              className="text-xl md:text-2xl mb-8 font-open-sans"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Criamos peças que acompanham mulheres reais na rotina, no treino e na vida
            </motion.p>
            <motion.button 
              className="bg-white text-lumos-turquesa px-8 py-3 rounded-full font-montserrat font-semibold text-lg hover:bg-gray-100 transition-colors"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Descobrir Coleção
            </motion.button>
          </div>
        </div>
      </section>

      {/* Produtos Section */}
      <section id="produtos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-montserrat font-bold text-gray-900 mb-4">
              Nossa Seleção Exclusiva
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubra peças fitness para mulheres ativas que combinam estilo, conforto e qualidade brasileira
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {produtos.map((produto) => (
              <ProdutoCard 
                key={produto.id} 
                produto={produto} 
                onAddToCart={adicionarAoCarrinho}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section className="py-20 bg-lumos-cinza">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-montserrat font-bold text-gray-900 mb-4">
              Por que escolher a Lumos?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <DiferencialCard
              icon={<Shield size={48} />}
              title="Tecnologia Avançada"
              description="Tecidos com propriedades de secagem rápida e compressão inteligente"
            />
            <DiferencialCard
              icon={<Award size={48} />}
              title="Modelagem Exclusiva"
              description="Cada peça desenvolvida com modelagem que valoriza o corpo feminino"
            />
            <DiferencialCard
              icon={<Star size={48} />}
              title="Qualidade Brasileira"
              description="Orgulhosamente fabricado no Brasil com os mais altos padrões"
            />
            <DiferencialCard
              icon={<Truck size={48} />}
              title="Versatilidade"
              description="Peças perfeitas para treino, trabalho e momentos de lazer"
            />
          </div>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-montserrat font-bold text-gray-900 mb-6">
                Nossa História
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Desde 2024, a Lumos Moda Fitness tem revolucionado o guarda-roupa das mulheres 
                brasileiras ativas, combinando estilo, conforto e qualidade em cada peça.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Nossa missão é criar roupas que acompanham mulheres reais em todos os momentos 
                da vida - do treino mais intenso ao dia a dia corrido, sempre com o toque 
                especial do design brasileiro.
              </p>
              <p className="text-lg text-gray-600">
                Acreditamos que cada mulher merece se sentir confiante, confortável e estilosa, 
                independentemente da atividade que esteja realizando.
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-lumos-turquesa to-lumos-rosa h-96 rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-lumos-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-montserrat font-bold text-lumos-turquesa mb-4">
                LUMOS
              </h3>
              <p className="text-gray-300">
                Luz que inspira movimento. Criando peças fitness para mulheres reais.
              </p>
            </div>
            <div>
              <h4 className="font-montserrat font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#home" className="text-gray-300 hover:text-lumos-turquesa">Início</a></li>
                <li><a href="#produtos" className="text-gray-300 hover:text-lumos-turquesa">Produtos</a></li>
                <li><a href="#sobre" className="text-gray-300 hover:text-lumos-turquesa">Sobre</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-montserrat font-semibold mb-4">Atendimento</h4>
              <ul className="space-y-2">
                <li className="text-gray-300">WhatsApp: (11) 99999-9999</li>
                <li className="text-gray-300">Email: contato@lumosfitness.com</li>
                <li className="text-gray-300">Seg-Sex: 9h às 18h</li>
              </ul>
            </div>
            <div>
              <h4 className="font-montserrat font-semibold mb-4">Siga a Lumos</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-lumos-turquesa">Instagram</a>
                <a href="#" className="text-gray-300 hover:text-lumos-turquesa">Facebook</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-300">
              © 2024 Lumos Moda Fitness. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente do Card de Produto
function ProdutoCard({ produto, onAddToCart }: { 
  produto: Produto; 
  onAddToCart: (produto: Produto, tamanho: string, cor: string) => void;
}) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(produto.tamanhos[0]);
  const [corSelecionada, setCorSelecionada] = useState(produto.cores[0]);

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className="h-64 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">Imagem do Produto</span>
        </div>
        {produto.destaque && (
          <span className="absolute top-2 left-2 bg-lumos-rosa text-white px-2 py-1 text-xs rounded">
            Destaque
          </span>
        )}
        <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
          <Heart size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="p-6">
        <h3 className="font-montserrat font-semibold text-lg mb-2">{produto.nome}</h3>
        <p className="text-gray-600 text-sm mb-4">{produto.descricao}</p>

        <div className="flex items-center mb-4">
          <span className="text-2xl font-bold text-lumos-turquesa">
            R$ {produto.preco.toFixed(2)}
          </span>
          {produto.precoOriginal && (
            <span className="ml-2 text-sm text-gray-500 line-through">
              R$ {produto.precoOriginal.toFixed(2)}
            </span>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tamanho:
          </label>
          <div className="flex space-x-2">
            {produto.tamanhos.map(tamanho => (
              <button
                key={tamanho}
                className={`px-3 py-1 text-sm border rounded ${
                  tamanhoSelecionado === tamanho 
                    ? 'bg-lumos-turquesa text-white border-lumos-turquesa' 
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
                onClick={() => setTamanhoSelecionado(tamanho)}
              >
                {tamanho}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cor:
          </label>
          <div className="flex space-x-2">
            {produto.cores.map(cor => (
              <button
                key={cor}
                className={`px-3 py-1 text-sm border rounded ${
                  corSelecionada === cor 
                    ? 'bg-lumos-turquesa text-white border-lumos-turquesa' 
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
                onClick={() => setCorSelecionada(cor)}
              >
                {cor}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="w-full bg-lumos-turquesa text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
          onClick={() => onAddToCart(produto, tamanhoSelecionado, corSelecionada)}
        >
          Adicionar ao Carrinho
        </button>
      </div>
    </motion.div>
  );
}

// Componente do Card de Diferencial
function DiferencialCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <motion.div 
      className="text-center p-6 bg-white rounded-lg shadow-sm"
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center text-lumos-turquesa mb-4">
        {icon}
      </div>
      <h3 className="font-montserrat font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}
