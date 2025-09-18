'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, MapPin, Truck, ChevronRight, ArrowLeft, Shield, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema de validação
const checkoutSchema = z.object({
  // Dados pessoais
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  cpf: z.string().min(11, 'CPF inválido'),

  // Endereço
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  endereco: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  numero: z.string().min(1, 'Número é obrigatório'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Bairro é obrigatório'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Estado deve ter 2 caracteres'),

  // Pagamento
  metodoPagamento: z.enum(['pix', 'cartao', 'boleto']),
  numeroCartao: z.string().optional(),
  nomeCartao: z.string().optional(),
  validadeCartao: z.string().optional(),
  cvvCartao: z.string().optional(),
  parcelasCartao: z.number().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface ItemCarrinho {
  produtoId: number;
  nome: string;
  preco: number;
  quantidade: number;
  tamanho: string;
  cor: string;
  imagem: string;
}

interface OpcaoFrete {
  nome: string;
  preco: number;
  prazo: string;
  servico: string;
}

export default function CheckoutPage() {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [opcoesFrete, setOpcoesFrete] = useState<OpcaoFrete[]>([]);
  const [freteSelecionado, setFreteSelecionado] = useState<OpcaoFrete | null>(null);
  const [loading, setLoading] = useState(false);
  const [pedidoFinalizado, setPedidoFinalizado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema)
  });

  const cep = watch('cep');
  const metodoPagamento = watch('metodoPagamento');

  useEffect(() => {
    carregarCarrinho();
  }, []);

  useEffect(() => {
    if (cep && cep.length === 8) {
      calcularFrete();
      buscarCep();
    }
  }, [cep]);

  const carregarCarrinho = async () => {
    try {
      // Simular carregamento do carrinho
      const carrinhoSimulado: ItemCarrinho[] = [
        {
          produtoId: 1,
          nome: "Legging High Power Turquesa",
          preco: 189.90,
          quantidade: 1,
          tamanho: "M",
          cor: "Turquesa",
          imagem: "/images/legging-turquesa.jpg"
        },
        {
          produtoId: 2,
          nome: "Top Force Preto",
          preco: 159.90,
          quantidade: 1,
          tamanho: "M",
          cor: "Preto",
          imagem: "/images/top-preto.jpg"
        }
      ];
      setCarrinho(carrinhoSimulado);
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
    }
  };

  const buscarCep = async () => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await response.json();

      if (!dados.erro) {
        setValue('endereco', dados.logradouro);
        setValue('bairro', dados.bairro);
        setValue('cidade', dados.localidade);
        setValue('estado', dados.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const calcularFrete = async () => {
    try {
      const response = await fetch('/api/frete/calcular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cep,
          produtos: carrinho
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOpcoesFrete(data.data.opcoes);
        setFreteSelecionado(data.data.opcoes[0]);
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
    }
  };

  const finalizarPedido = async (dadosFormulario: CheckoutFormData) => {
    setLoading(true);

    try {
      const response = await fetch('/api/checkout/processar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: 'user_session_' + Date.now(),
          cliente: {
            nome: dadosFormulario.nome,
            email: dadosFormulario.email,
            telefone: dadosFormulario.telefone,
            cpf: dadosFormulario.cpf
          },
          endereco: {
            cep: dadosFormulario.cep,
            endereco: dadosFormulario.endereco,
            numero: dadosFormulario.numero,
            complemento: dadosFormulario.complemento,
            bairro: dadosFormulario.bairro,
            cidade: dadosFormulario.cidade,
            estado: dadosFormulario.estado
          },
          pagamento: {
            metodo: dadosFormulario.metodoPagamento,
            numeroCartao: dadosFormulario.numeroCartao,
            nomeCartao: dadosFormulario.nomeCartao,
            validade: dadosFormulario.validadeCartao,
            cvv: dadosFormulario.cvvCartao,
            parcelas: dadosFormulario.parcelasCartao
          },
          frete: freteSelecionado
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPedidoFinalizado(true);
      }
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
    } finally {
      setLoading(false);
    }
  };

  const subtotal = carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  const total = subtotal + (freteSelecionado?.preco || 0);

  const proximaEtapa = async () => {
    const isValid = await trigger();
    if (isValid) {
      setEtapaAtual(etapaAtual + 1);
    }
  };

  if (pedidoFinalizado) {
    return (
      <div className="min-h-screen bg-lumos-cream flex items-center justify-center">
        <PedidoConfirmado />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lumos-cream py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-montserrat font-bold text-gray-900 mb-4">
            Finalizar Compra
          </h1>
          <div className="flex justify-center items-center space-x-4">
            {[1, 2, 3].map((etapa) => (
              <div key={etapa} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  etapaAtual >= etapa 
                    ? 'bg-lumos-turquesa text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {etapa}
                </div>
                {etapa < 3 && (
                  <ChevronRight 
                    className={`mx-2 ${
                      etapaAtual > etapa ? 'text-lumos-turquesa' : 'text-gray-300'
                    }`} 
                    size={20} 
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-8 mt-4 text-sm">
            <span className={etapaAtual >= 1 ? 'text-lumos-turquesa font-semibold' : 'text-gray-500'}>
              Dados Pessoais
            </span>
            <span className={etapaAtual >= 2 ? 'text-lumos-turquesa font-semibold' : 'text-gray-500'}>
              Entrega
            </span>
            <span className={etapaAtual >= 3 ? 'text-lumos-turquesa font-semibold' : 'text-gray-500'}>
              Pagamento
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(finalizarPedido)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Formulário Principal */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">

                {/* Etapa 1: Dados Pessoais */}
                {etapaAtual === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-montserrat font-semibold mb-6 flex items-center">
                      <MapPin className="mr-2 text-lumos-turquesa" size={24} />
                      Dados Pessoais
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nome Completo *
                        </label>
                        <input
                          {...register('nome')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="Seu nome completo"
                        />
                        {errors.nome && (
                          <p className="mt-1 text-sm text-red-600">{errors.nome.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          {...register('email')}
                          type="email"
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="seu@email.com"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Telefone *
                        </label>
                        <input
                          {...register('telefone')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="(11) 99999-9999"
                        />
                        {errors.telefone && (
                          <p className="mt-1 text-sm text-red-600">{errors.telefone.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CPF *
                        </label>
                        <input
                          {...register('cpf')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="000.000.000-00"
                        />
                        {errors.cpf && (
                          <p className="mt-1 text-sm text-red-600">{errors.cpf.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={proximaEtapa}
                        className="w-full bg-lumos-turquesa text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                      >
                        Continuar para Entrega
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Etapa 2: Endereço e Frete */}
                {etapaAtual === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-montserrat font-semibold mb-6 flex items-center">
                      <Truck className="mr-2 text-lumos-turquesa" size={24} />
                      Endereço de Entrega
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CEP *
                        </label>
                        <input
                          {...register('cep')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="00000-000"
                          maxLength={8}
                        />
                        {errors.cep && (
                          <p className="mt-1 text-sm text-red-600">{errors.cep.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Endereço *
                        </label>
                        <input
                          {...register('endereco')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="Rua, avenida..."
                        />
                        {errors.endereco && (
                          <p className="mt-1 text-sm text-red-600">{errors.endereco.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número *
                        </label>
                        <input
                          {...register('numero')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="123"
                        />
                        {errors.numero && (
                          <p className="mt-1 text-sm text-red-600">{errors.numero.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Complemento
                        </label>
                        <input
                          {...register('complemento')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="Apto, bloco..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bairro *
                        </label>
                        <input
                          {...register('bairro')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="Seu bairro"
                        />
                        {errors.bairro && (
                          <p className="mt-1 text-sm text-red-600">{errors.bairro.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cidade *
                        </label>
                        <input
                          {...register('cidade')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                          placeholder="Sua cidade"
                        />
                        {errors.cidade && (
                          <p className="mt-1 text-sm text-red-600">{errors.cidade.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estado *
                        </label>
                        <select
                          {...register('estado')}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                        >
                          <option value="">Selecione</option>
                          <option value="SP">São Paulo</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="MG">Minas Gerais</option>
                          {/* Adicionar todos os estados */}
                        </select>
                        {errors.estado && (
                          <p className="mt-1 text-sm text-red-600">{errors.estado.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Opções de Frete */}
                    {opcoesFrete.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Escolha a forma de entrega:</h3>
                        <div className="space-y-3">
                          {opcoesFrete.map((opcao, index) => (
                            <div
                              key={index}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                freteSelecionado?.nome === opcao.nome
                                  ? 'border-lumos-turquesa bg-lumos-turquesa/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setFreteSelecionado(opcao)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center">
                                    <input
                                      type="radio"
                                      checked={freteSelecionado?.nome === opcao.nome}
                                      onChange={() => setFreteSelecionado(opcao)}
                                      className="mr-3"
                                    />
                                    <span className="font-semibold">{opcao.nome}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 ml-6">{opcao.prazo}</p>
                                </div>
                                <span className="font-semibold text-lumos-turquesa">
                                  {opcao.preco === 0 ? 'Grátis' : `R$ ${opcao.preco.toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setEtapaAtual(1)}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <ArrowLeft className="inline mr-2" size={20} />
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={proximaEtapa}
                        className="flex-1 bg-lumos-turquesa text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                      >
                        Continuar para Pagamento
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Etapa 3: Pagamento */}
                {etapaAtual === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h2 className="text-xl font-montserrat font-semibold mb-6 flex items-center">
                      <CreditCard className="mr-2 text-lumos-turquesa" size={24} />
                      Forma de Pagamento
                    </h2>

                    {/* Métodos de Pagamento */}
                    <div className="space-y-4 mb-6">
                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          metodoPagamento === 'pix'
                            ? 'border-lumos-turquesa bg-lumos-turquesa/5'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setValue('metodoPagamento', 'pix')}
                      >
                        <div className="flex items-center">
                          <input
                            {...register('metodoPagamento')}
                            type="radio"
                            value="pix"
                            className="mr-3"
                          />
                          <div>
                            <span className="font-semibold">PIX</span>
                            <p className="text-sm text-gray-600">Pagamento instantâneo</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          metodoPagamento === 'cartao'
                            ? 'border-lumos-turquesa bg-lumos-turquesa/5'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setValue('metodoPagamento', 'cartao')}
                      >
                        <div className="flex items-center">
                          <input
                            {...register('metodoPagamento')}
                            type="radio"
                            value="cartao"
                            className="mr-3"
                          />
                          <div>
                            <span className="font-semibold">Cartão de Crédito</span>
                            <p className="text-sm text-gray-600">Até 6x sem juros</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          metodoPagamento === 'boleto'
                            ? 'border-lumos-turquesa bg-lumos-turquesa/5'
                            : 'border-gray-200'
                        }`}
                        onClick={() => setValue('metodoPagamento', 'boleto')}
                      >
                        <div className="flex items-center">
                          <input
                            {...register('metodoPagamento')}
                            type="radio"
                            value="boleto"
                            className="mr-3"
                          />
                          <div>
                            <span className="font-semibold">Boleto Bancário</span>
                            <p className="text-sm text-gray-600">Vencimento em 3 dias úteis</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dados do Cartão */}
                    {metodoPagamento === 'cartao' && (
                      <div className="border-t pt-6 space-y-4">
                        <h3 className="font-semibold mb-4">Dados do Cartão</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Número do Cartão *
                            </label>
                            <input
                              {...register('numeroCartao')}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                              placeholder="0000 0000 0000 0000"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nome no Cartão *
                            </label>
                            <input
                              {...register('nomeCartao')}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                              placeholder="Nome como no cartão"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Validade *
                            </label>
                            <input
                              {...register('validadeCartao')}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                              placeholder="MM/AA"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              CVV *
                            </label>
                            <input
                              {...register('cvvCartao')}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                              placeholder="123"
                              maxLength={4}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Parcelas
                            </label>
                            <select
                              {...register('parcelasCartao', { valueAsNumber: true })}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-lumos-turquesa focus:border-transparent"
                            >
                              <option value={1}>1x de R$ {total.toFixed(2)} (à vista)</option>
                              <option value={2}>2x de R$ {(total/2).toFixed(2)} sem juros</option>
                              <option value={3}>3x de R$ {(total/3).toFixed(2)} sem juros</option>
                              <option value={4}>4x de R$ {(total/4).toFixed(2)} sem juros</option>
                              <option value={5}>5x de R$ {(total/5).toFixed(2)} sem juros</option>
                              <option value={6}>6x de R$ {(total/6).toFixed(2)} sem juros</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setEtapaAtual(2)}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        <ArrowLeft className="inline mr-2" size={20} />
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-lumos-turquesa text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Shield className="inline mr-2" size={20} />
                            Finalizar Pedido
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h3 className="text-xl font-montserrat font-semibold mb-6">
                  Resumo do Pedido
                </h3>

                {/* Itens do Carrinho */}
                <div className="space-y-4 mb-6">
                  {carrinho.map((item) => (
                    <div key={`${item.produtoId}-${item.tamanho}-${item.cor}`} className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.nome}</h4>
                        <p className="text-xs text-gray-600">{item.tamanho} - {item.cor}</p>
                        <p className="text-xs text-gray-600">Qtd: {item.quantidade}</p>
                      </div>
                      <span className="font-semibold">
                        R$ {(item.preco * item.quantidade).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Resumo Financeiro */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>
                      {freteSelecionado?.preco === 0 
                        ? 'Grátis' 
                        : `R$ ${(freteSelecionado?.preco || 0).toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-lumos-turquesa">R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Segurança */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center text-green-800">
                    <Shield className="mr-2 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-sm">Compra 100% Segura</p>
                      <p className="text-xs">Dados protegidos com certificado SSL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente de Confirmação do Pedido
function PedidoConfirmado() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center"
    >
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-montserrat font-bold text-gray-900 mb-4">
        Pedido Confirmado!
      </h2>

      <p className="text-gray-600 mb-6">
        Seu pedido foi processado com sucesso. Você receberá um email com os detalhes 
        da compra e informações para acompanhamento.
      </p>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Número do Pedido:</span>
          <span className="font-semibold">#LUM{Date.now()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Data:</span>
          <span>{new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full bg-lumos-turquesa text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
        >
          Continuar Comprando
        </button>
        <button 
          onClick={() => window.location.href = '/minha-conta'}
          className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Acompanhar Pedido
        </button>
      </div>
    </motion.div>
  );
}
