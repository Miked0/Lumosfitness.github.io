const mercadopago = require('mercadopago');
const { createLogger } = require('../utils/logger');
const { query } = require('../database/connection');

const logger = createLogger('mercadopago');

// Configuração do Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
  sandbox: process.env.NODE_ENV !== 'production'
});

class MercadoPagoService {
  constructor() {
    this.publicKey = process.env.MP_PUBLIC_KEY;
    this.accessToken = process.env.MP_ACCESS_TOKEN;
    this.webhookSecret = process.env.MP_WEBHOOK_SECRET;
    this.isProduction = process.env.NODE_ENV === 'production';
    
    if (!this.accessToken || !this.publicKey) {
      logger.error('Credenciais do Mercado Pago não configuradas');
      throw new Error('Mercado Pago não configurado corretamente');
    }
    
    logger.info(`Mercado Pago configurado - Modo: ${this.isProduction ? 'PRODUÇÃO' : 'SANDBOX'}`);
  }

  /**
   * Criar preferência de pagamento
   */
  async criarPreferencia(dadosPedido) {
    try {
      const {
        pedidoId,
        itens,
        cliente,
        endereco,
        valorTotal,
        valorFrete,
        desconto = 0
      } = dadosPedido;

      // Preparar itens para o Mercado Pago
      const items = itens.map(item => ({
        id: item.produtoId.toString(),
        title: `${item.nome} - ${item.tamanho} - ${item.cor}`,
        description: `Produto Lumos Fitness - ${item.nome}`,
        picture_url: item.imagem ? `${process.env.FRONTEND_URL}${item.imagem}` : null,
        category_id: 'fashion',
        quantity: item.quantidade,
        unit_price: parseFloat(item.preco),
        currency_id: 'BRL'
      }));

      // Adicionar frete como item se houver
      if (valorFrete > 0) {
        items.push({
          id: 'frete',
          title: 'Frete',
          description: 'Taxa de entrega',
          category_id: 'services',
          quantity: 1,
          unit_price: parseFloat(valorFrete),
          currency_id: 'BRL'
        });
      }

      // Aplicar desconto se houver
      if (desconto > 0) {
        items.push({
          id: 'desconto',
          title: 'Desconto',
          description: 'Desconto aplicado',
          category_id: 'discount',
          quantity: 1,
          unit_price: -parseFloat(desconto),
          currency_id: 'BRL'
        });
      }

      const preference = {
        items,
        payer: {
          name: cliente.nome,
          surname: cliente.nome.split(' ').slice(1).join(' ') || '',
          email: cliente.email,
          phone: {
            area_code: cliente.telefone ? cliente.telefone.substring(0, 2) : '11',
            number: cliente.telefone ? cliente.telefone.substring(2) : '999999999'
          },
          identification: {
            type: 'CPF',
            number: cliente.cpf.replace(/\D/g, '')
          },
          address: {
            street_name: endereco.rua,
            street_number: parseInt(endereco.numero) || 0,
            zip_code: endereco.cep.replace(/\D/g, '')
          }
        },
        payment_methods: {
          excluded_payment_methods: [], // Permitir todos os métodos
          excluded_payment_types: [],
          installments: 12 // Máximo 12 parcelas
        },
        shipments: {
          cost: parseFloat(valorFrete),
          mode: 'not_specified',
          receiver_address: {
            zip_code: endereco.cep.replace(/\D/g, ''),
            street_name: endereco.rua,
            street_number: parseInt(endereco.numero) || 0,
            floor: endereco.complemento || '',
            apartment: endereco.complemento || ''
          }
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/checkout/sucesso`,
          failure: `${process.env.FRONTEND_URL}/checkout/erro`,
          pending: `${process.env.FRONTEND_URL}/checkout/pendente`
        },
        auto_return: 'approved',
        external_reference: pedidoId.toString(),
        notification_url: `${process.env.API_URL}/api/webhooks/mercadopago`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
        additional_info: {
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            picture_url: item.picture_url,
            category_id: item.category_id,
            quantity: item.quantity,
            unit_price: item.unit_price
          })),
          payer: {
            first_name: cliente.nome.split(' ')[0],
            last_name: cliente.nome.split(' ').slice(1).join(' ') || cliente.nome,
            phone: {
              area_code: cliente.telefone ? cliente.telefone.substring(0, 2) : '11',
              number: cliente.telefone ? cliente.telefone.substring(2) : '999999999'
            },
            address: {
              zip_code: endereco.cep.replace(/\D/g, ''),
              street_name: `${endereco.rua}, ${endereco.numero}`,
              street_number: parseInt(endereco.numero) || 0
            },
            registration_date: new Date().toISOString()
          },
          shipments: {
            receiver_address: {
              zip_code: endereco.cep.replace(/\D/g, ''),
              street_name: endereco.rua,
              street_number: parseInt(endereco.numero) || 0,
              floor: endereco.complemento || '',
              apartment: endereco.complemento || '',
              city_name: endereco.cidade,
              state_name: endereco.estado,
              country_name: 'Brasil'
            }
          }
        },
        metadata: {
          pedido_id: pedidoId,
          cliente_email: cliente.email,
          valor_total: valorTotal,
          timestamp: new Date().toISOString()
        }
      };

      const response = await mercadopago.preferences.create(preference);
      
      // Registrar log do pagamento
      await this.registrarLog(pedidoId, 'preference_created', {
        preference_id: response.body.id,
        init_point: response.body.init_point,
        sandbox_init_point: response.body.sandbox_init_point
      }, 'created');

      logger.info(`Preferência criada para pedido ${pedidoId}`, {
        preferenceId: response.body.id,
        valorTotal,
        itens: itens.length
      });

      return {
        success: true,
        preferenceId: response.body.id,
        initPoint: this.isProduction ? response.body.init_point : response.body.sandbox_init_point,
        publicKey: this.publicKey
      };

    } catch (error) {
      logger.error('Erro ao criar preferência:', error);
      
      await this.registrarLog(dadosPedido.pedidoId, 'preference_error', {
        error: error.message,
        cause: error.cause
      }, 'error');

      throw new Error(`Erro ao processar pagamento: ${error.message}`);
    }
  }

  /**
   * Criar pagamento PIX
   */
  async criarPagamentoPix(dadosPedido) {
    try {
      const {
        pedidoId,
        cliente,
        valorTotal,
        descricao = 'Compra Lumos Fitness'
      } = dadosPedido;

      const payment = {
        transaction_amount: parseFloat(valorTotal),
        description: descricao,
        payment_method_id: 'pix',
        payer: {
          first_name: cliente.nome.split(' ')[0],
          last_name: cliente.nome.split(' ').slice(1).join(' ') || cliente.nome,
          email: cliente.email,
          identification: {
            type: 'CPF',
            number: cliente.cpf.replace(/\D/g, '')
          }
        },
        external_reference: pedidoId.toString(),
        notification_url: `${process.env.API_URL}/api/webhooks/mercadopago`,
        metadata: {
          pedido_id: pedidoId,
          tipo_pagamento: 'pix'
        }
      };

      const response = await mercadopago.payment.create(payment);
      const paymentData = response.body;

      // Registrar log
      await this.registrarLog(pedidoId, 'pix_created', {
        payment_id: paymentData.id,
        status: paymentData.status,
        qr_code: paymentData.point_of_interaction?.transaction_data?.qr_code
      }, paymentData.status);

      logger.info(`Pagamento PIX criado para pedido ${pedidoId}`, {
        paymentId: paymentData.id,
        status: paymentData.status,
        valor: valorTotal
      });

      return {
        success: true,
        paymentId: paymentData.id,
        status: paymentData.status,
        qrCode: paymentData.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: paymentData.point_of_interaction?.transaction_data?.qr_code,
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        valorTotal: parseFloat(valorTotal)
      };

    } catch (error) {
      logger.error('Erro ao criar pagamento PIX:', error);
      
      await this.registrarLog(dadosPedido.pedidoId, 'pix_error', {
        error: error.message
      }, 'error');

      throw new Error(`Erro ao gerar PIX: ${error.message}`);
    }
  }

  /**
   * Consultar status do pagamento
   */
  async consultarPagamento(paymentId) {
    try {
      const response = await mercadopago.payment.findById(paymentId);
      const payment = response.body;

      return {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        transactionAmount: payment.transaction_amount,
        netReceivedAmount: payment.net_received_amount,
        installments: payment.installments,
        paymentMethod: {
          id: payment.payment_method_id,
          type: payment.payment_type_id,
          issuer: payment.issuer_id
        },
        card: payment.card ? {
          lastFourDigits: payment.card.last_four_digits,
          firstSixDigits: payment.card.first_six_digits,
          expirationMonth: payment.card.expiration_month,
          expirationYear: payment.card.expiration_year,
          cardholderName: payment.card.cardholder?.name
        } : null,
        dateApproved: payment.date_approved,
        dateCreated: payment.date_created,
        externalReference: payment.external_reference,
        description: payment.description
      };

    } catch (error) {
      logger.error('Erro ao consultar pagamento:', error);
      throw new Error(`Erro ao consultar pagamento: ${error.message}`);
    }
  }

  /**
   * Processar webhook do Mercado Pago
   */
  async processarWebhook(webhookData) {
    try {
      const { type, data, action } = webhookData;

      logger.info('Webhook recebido do Mercado Pago', {
        type,
        action,
        dataId: data.id
      });

      if (type === 'payment') {
        return await this.processarWebhookPagamento(data.id);
      }

      return { success: true, message: 'Webhook processado' };

    } catch (error) {
      logger.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  /**
   * Processar webhook de pagamento
   */
  async processarWebhookPagamento(paymentId) {
    try {
      const paymentData = await this.consultarPagamento(paymentId);
      const pedidoId = paymentData.externalReference;

      if (!pedidoId) {
        logger.warn(`Pagamento ${paymentId} sem referência externa`);
        return { success: false, message: 'Pagamento sem referência de pedido' };
      }

      // Registrar log do webhook
      await this.registrarLog(pedidoId, 'webhook_received', {
        payment_id: paymentId,
        status: paymentData.status,
        status_detail: paymentData.statusDetail
      }, paymentData.status);

      // Atualizar status do pedido
      const novoStatus = this.mapearStatusPagamento(paymentData.status);
      
      await query(
        `UPDATE pedidos SET 
         status = $1, 
         mp_payment_id = $2, 
         dados_pagamento = $3, 
         atualizado_em = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [
          novoStatus,
          paymentId,
          JSON.stringify(paymentData),
          pedidoId
        ]
      );

      logger.info(`Status do pedido ${pedidoId} atualizado`, {
        paymentId,
        statusAnterior: 'pendente',
        novoStatus,
        statusPagamento: paymentData.status
      });

      // Se pagamento foi aprovado, atualizar estoque
      if (paymentData.status === 'approved') {
        await this.atualizarEstoqueAprovacao(pedidoId);
      }

      return {
        success: true,
        pedidoId,
        paymentId,
        status: novoStatus,
        paymentData
      };

    } catch (error) {
      logger.error('Erro ao processar webhook de pagamento:', error);
      throw error;
    }
  }

  /**
   * Mapear status do Mercado Pago para status do pedido
   */
  mapearStatusPagamento(mpStatus) {
    const statusMap = {
      'approved': 'aprovado',
      'pending': 'pendente_pagamento',
      'authorized': 'autorizado',
      'in_process': 'processando',
      'in_mediation': 'em_mediacao',
      'rejected': 'rejeitado',
      'cancelled': 'cancelado',
      'refunded': 'reembolsado',
      'charged_back': 'estornado'
    };

    return statusMap[mpStatus] || 'pendente';
  }

  /**
   * Atualizar estoque após aprovação do pagamento
   */
  async atualizarEstoqueAprovacao(pedidoId) {
    try {
      // Obter itens do pedido
      const result = await query(
        'SELECT ip.produto_id, ip.quantidade FROM itens_pedido ip WHERE ip.pedido_id = $1',
        [pedidoId]
      );

      for (const item of result.rows) {
        // Diminuir estoque
        await query(
          'UPDATE produtos SET estoque = estoque - $1 WHERE id = $2',
          [item.quantidade, item.produto_id]
        );

        // Registrar movimentação de estoque
        await query(
          `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, pedido_id, criado_por) 
           VALUES ($1, 'saida', $2, 'Venda aprovada', $3, 'sistema')`,
          [item.produto_id, item.quantidade, pedidoId]
        );
      }

      logger.info(`Estoque atualizado para pedido aprovado ${pedidoId}`);

    } catch (error) {
      logger.error('Erro ao atualizar estoque:', error);
      throw error;
    }
  }

  /**
   * Registrar log de pagamento
   */
  async registrarLog(pedidoId, evento, dados, status) {
    try {
      await query(
        `INSERT INTO logs_pagamento (pedido_id, gateway, evento, dados, status) 
         VALUES ($1, 'mercadopago', $2, $3, $4)`,
        [pedidoId, evento, JSON.stringify(dados), status]
      );
    } catch (error) {
      logger.error('Erro ao registrar log de pagamento:', error);
    }
  }

  /**
   * Validar configuração
   */
  validarConfiguracao() {
    const camposObrigatorios = [
      'MP_ACCESS_TOKEN',
      'MP_PUBLIC_KEY'
    ];

    const camposFaltando = camposObrigatorios.filter(campo => !process.env[campo]);

    if (camposFaltando.length > 0) {
      throw new Error(`Variáveis de ambiente faltando: ${camposFaltando.join(', ')}`);
    }

    return true;
  }
}

module.exports = new MercadoPagoService();