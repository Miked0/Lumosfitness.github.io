'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Package, Users, CreditCard, TrendingUp, Eye, 
  AlertCircle, Download, RefreshCw, Calendar, Filter, Search 
} from 'lucide-react';

interface Venda {
  id: number;
  cliente: string;
  total: number;
  status: string;
  data: string;
  itens: number;
}

interface ProdutoEstoque {
  id: number;
  nome: string;
  categoria: string;
  estoque: number;
  preco: number;
  ativo: boolean;
  alertaEstoqueBaixo: boolean;
}

interface ResumoVendas {
  totalVendas: number;
  faturamento: number;
  ticketMedio: number;
}

export default function AdminPanelPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [resumo, setResumo] = useState<ResumoVendas>({ totalVendas: 0, faturamento: 0, ticketMedio: 0 });
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [filtroData, setFiltroData] = useState('7dias');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar vendas
      const vendasResponse = await fetch('/api/admin/vendas');
      const vendasData = await vendasResponse.json();

      if (vendasData.success) {
        setVendas(vendasData.data.vendas);
        setResumo(vendasData.data.resumo);
      }

      // Carregar estoque
      const estoqueResponse = await fetch('/api/admin/estoque');
      const estoqueData = await estoqueResponse.json();

      if (estoqueData.success) {
        setEstoque(estoqueData.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const estatisticasMockadas = {
    vendasHoje: 12,
    faturamentoHoje: 2849.80,
    conversao: 3.2,
    visitantes: 1247,
    produtosMaisVendidos: [
      { nome: 'Legging High Power', vendas: 45 },
      { nome: 'Conjunto Boss', vendas: 32 },
      { nome: 'Top Force', vendas: 28 }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lumos-turquesa"></div>
          <p className="mt-4 text-gray-600">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-montserrat font-bold text-lumos-turquesa">
                Lumos Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={carregarDados}
                className="p-2 text-gray-600 hover:text-lumos-turquesa rounded-lg hover:bg-gray-100"
              >
                <RefreshCw size={20} />
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navegação por Abas */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', nome: 'Dashboard', icon: BarChart3 },
              { id: 'vendas', nome: 'Vendas', icon: CreditCard },
              { id: 'estoque', nome: 'Estoque', icon: Package },
              { id: 'relatorios', nome: 'Relatórios', icon: TrendingUp }
            ].map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-colors ${
                  abaAtiva === aba.id
                    ? 'bg-lumos-turquesa text-white'
                    : 'text-gray-600 hover:text-lumos-turquesa hover:bg-gray-100'
                }`}
              >
                <aba.icon className="mr-2" size={20} />
                {aba.nome}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard */}
        {abaAtiva === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Vendas Hoje"
                value={estatisticasMockadas.vendasHoje}
                icon={<CreditCard size={24} />}
                color="bg-blue-500"
                trend="+12%"
              />
              <StatCard
                title="Faturamento Hoje"
                value={`R$ ${estatisticasMockadas.faturamentoHoje.toFixed(2)}`}
                icon={<TrendingUp size={24} />}
                color="bg-green-500"
                trend="+8%"
              />
              <StatCard
                title="Taxa de Conversão"
                value={`${estatisticasMockadas.conversao}%`}
                icon={<BarChart3 size={24} />}
                color="bg-purple-500"
                trend="+0.5%"
              />
              <StatCard
                title="Visitantes"
                value={estatisticasMockadas.visitantes}
                icon={<Eye size={24} />}
                color="bg-orange-500"
                trend="+15%"
              />
            </div>

            {/* Resumo Geral */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="mr-2 text-lumos-turquesa" size={20} />
                  Resumo de Vendas
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total de Vendas:</span>
                    <span className="font-semibold text-xl">{resumo.totalVendas}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Faturamento Total:</span>
                    <span className="font-semibold text-xl text-green-600">
                      R$ {resumo.faturamento.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ticket Médio:</span>
                    <span className="font-semibold text-xl text-lumos-turquesa">
                      R$ {resumo.ticketMedio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Package className="mr-2 text-lumos-turquesa" size={20} />
                  Produtos Mais Vendidos
                </h3>
                <div className="space-y-3">
                  {estatisticasMockadas.produtosMaisVendidos.map((produto, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-700">{produto.nome}</span>
                      <span className="font-semibold bg-gray-100 px-2 py-1 rounded">
                        {produto.vendas} vendas
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alertas de Estoque */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertCircle className="mr-2 text-orange-500" size={20} />
                Alertas de Estoque Baixo
              </h3>
              <div className="space-y-2">
                {estoque.filter(p => p.alertaEstoqueBaixo).map((produto) => (
                  <div key={produto.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <span className="font-medium">{produto.nome}</span>
                      <span className="text-sm text-gray-600 ml-2">({produto.categoria})</span>
                    </div>
                    <span className="text-orange-600 font-semibold">
                      {produto.estoque} unidades
                    </span>
                  </div>
                ))}
                {estoque.filter(p => p.alertaEstoqueBaixo).length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum alerta de estoque baixo no momento
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Aba de Vendas */}
        {abaAtiva === 'vendas' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Vendas Recentes</h3>
                  <div className="flex space-x-3">
                    <select 
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={filtroData}
                      onChange={(e) => setFiltroData(e.target.value)}
                    >
                      <option value="7dias">Últimos 7 dias</option>
                      <option value="30dias">Últimos 30 dias</option>
                      <option value="90dias">Últimos 90 dias</option>
                    </select>
                    <button className="flex items-center px-4 py-2 bg-lumos-turquesa text-white rounded-lg hover:bg-primary-600 transition-colors">
                      <Download className="mr-2" size={16} />
                      Exportar
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pedido
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Itens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendas.map((venda) => (
                      <tr key={venda.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            #{venda.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{venda.cliente}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {new Date(venda.data).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">{venda.itens} itens</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            venda.status === 'aprovado' ? 'bg-green-100 text-green-800' :
                            venda.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {venda.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            R$ {venda.total.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-lumos-turquesa hover:text-primary-600">
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Aba de Estoque */}
        {abaAtiva === 'estoque' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Controle de Estoque</h3>
                  <div className="flex space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Buscar produto..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                      />
                    </div>
                    <button className="flex items-center px-4 py-2 bg-lumos-turquesa text-white rounded-lg hover:bg-primary-600 transition-colors">
                      <Package className="mr-2" size={16} />
                      Novo Produto
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estoque
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estoque.map((produto) => (
                      <tr key={produto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {produto.nome}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">{produto.categoria}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            R$ {produto.preco.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            produto.alertaEstoqueBaixo ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {produto.estoque} unidades
                          </span>
                          {produto.alertaEstoqueBaixo && (
                            <AlertCircle className="inline ml-2 text-red-500" size={16} />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            produto.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-lumos-turquesa hover:text-primary-600 mr-4">
                            Editar
                          </button>
                          <button className="text-red-600 hover:text-red-800">
                            {produto.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Aba de Relatórios */}
        {abaAtiva === 'relatorios' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ReportCard
                title="Relatório de Vendas"
                description="Análise completa das vendas por período"
                icon={<CreditCard size={24} />}
                color="bg-blue-500"
              />
              <ReportCard
                title="Relatório de Estoque"
                description="Controle e movimentação de produtos"
                icon={<Package size={24} />}
                color="bg-green-500"
              />
              <ReportCard
                title="Relatório Financeiro"
                description="Resumo financeiro e faturamento"
                icon={<TrendingUp size={24} />}
                color="bg-purple-500"
              />
              <ReportCard
                title="Produtos Mais Vendidos"
                description="Ranking de produtos por vendas"
                icon={<BarChart3 size={24} />}
                color="bg-orange-500"
              />
              <ReportCard
                title="Análise de Clientes"
                description="Perfil e comportamento dos clientes"
                icon={<Users size={24} />}
                color="bg-teal-500"
              />
              <ReportCard
                title="Performance do Site"
                description="Métricas de conversão e tráfego"
                icon={<Eye size={24} />}
                color="bg-pink-500"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Componente de Card de Estatística
function StatCard({ title, value, icon, color, trend }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 font-medium">
              {trend} vs período anterior
            </p>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Componente de Card de Relatório
function ReportCard({ title, description, icon, color }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div className={`${color} p-3 rounded-lg text-white w-fit mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <button className="flex items-center text-lumos-turquesa hover:text-primary-600 font-medium">
        <Download className="mr-2" size={16} />
        Gerar Relatório
      </button>
    </div>
  );
}
