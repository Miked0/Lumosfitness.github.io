
// Integração completa com Mercado Pago
const MercadoPago = require('mercadopago');

class MercadoPagoService {
  constructor() {
    MercadoPago.configure({
      access_token: process.env.MP_ACCESS_TOKEN,
    });
  }

  // Criar preferência de pagamento
  async criarPreferencia(pedido) {
    try {
      const preference = {
        items: pedido.itens.map(item => ({
          id: item.produtoId.toString(),
          title: item.nome,
          category_id: 'fashion',
          quantity: item.quantidade,
          currency_id: 'BRL',
          unit_price: item.preco
        })),
        payer: {
          name: pedido.cliente.nome,
          email: pedido.cliente.email,
          phone: {
            number: pedido.cliente.telefone
          },
          identification: {
            type: 'CPF',
            number: pedido.cliente.cpf
          },
          address: {
            street_name: `${pedido.endereco.endereco}, ${pedido.endereco.numero}`,
            street_number: pedido.endereco.numero,
            zip_code: pedido.endereco.cep
          }
        },
        shipments: {
          cost: pedido.frete.preco,
          mode: 'not_specified',
          receiver_address: {
            zip_code: pedido.endereco.cep,
            street_name: pedido.endereco.endereco,
            street_number: pedido.endereco.numero,
            floor: pedido.endereco.complemento || '',
            apartment: pedido.endereco.complemento || '',
            city_name: pedido.endereco.cidade,
            state_name: pedido.endereco.estado,
            country_name: 'Brasil'
          }
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pagamento/sucesso`,
          failure: `${process.env.FRONTEND_URL}/pagamento/erro`,
          pending: `${process.env.FRONTEND_URL}/pagamento/pendente`
        },
        auto_return: 'approved',
        external_reference: pedido.id.toString(),
        notification_url: `${process.env.API_URL}/webhooks/mercadopago`,
        statement_descriptor: 'LUMOS FITNESS',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      };

      const response = await MercadoPago.preferences.create(preference);
      return {
        success: true,
        preference_id: response.body.id,
        init_point: response.body.init_point,
        sandbox_init_point: response.body.sandbox_init_point
      };
    } catch (error) {
      console.error('Erro ao criar preferência MP:', error);
      return { success: false, error: error.message };
    }
  }

  // Criar pagamento PIX
  async criarPagamentoPix(pedido) {
    try {
      const payment = {
        transaction_amount: pedido.total,
        description: `Pedido Lumos Fitness #${pedido.id}`,
        payment_method_id: 'pix',
        payer: {
          email: pedido.cliente.email,
          first_name: pedido.cliente.nome.split(' ')[0],
          last_name: pedido.cliente.nome.split(' ').slice(1).join(' '),
          identification: {
            type: 'CPF',
            number: pedido.cliente.cpf
          }
        },
        notification_url: `${process.env.API_URL}/webhooks/mercadopago`,
        external_reference: pedido.id.toString()
      };

      const response = await MercadoPago.payment.create(payment);

      return {
        success: true,
        payment_id: response.body.id,
        status: response.body.status,
        qr_code: response.body.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: response.body.point_of_interaction.transaction_data.qr_code_base64,
        expiration_date: response.body.date_of_expiration
      };
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      return { success: false, error: error.message };
    }
  }

  // Processar webhook
  async processarWebhook(notification) {
    try {
      if (notification.type === 'payment') {
        const payment = await MercadoPago.payment.findById(notification.data.id);

        return {
          success: true,
          payment_id: payment.body.id,
          status: payment.body.status,
          external_reference: payment.body.external_reference,
          transaction_amount: payment.body.transaction_amount
        };
      }
      return { success: false, error: 'Tipo de notificação não suportado' };
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = MercadoPagoService;
