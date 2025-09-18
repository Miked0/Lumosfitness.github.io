
const axios = require('axios');

class LogisticsService {
  constructor() {
    this.correiosUser = process.env.CORREIOS_USER;
    this.correiosPassword = process.env.CORREIOS_PASSWORD;
    this.loggiToken = process.env.LOGGI_TOKEN;
    this.frenetToken = process.env.FRENET_TOKEN;
  }

  // Calcular frete com múltiplas transportadoras
  async calcularFrete(cepOrigem, cepDestino, produtos, valorDeclarado = 0) {
    const opcoes = [];

    try {
      // Calcular peso e dimensões totais
      const pesoTotal = produtos.reduce((peso, produto) => {
        return peso + (produto.quantidade * (produto.peso || 0.2)); // 200g por item padrão
      }, 0);

      const valorTotal = produtos.reduce((valor, produto) => {
        return valor + (produto.quantidade * produto.preco);
      }, 0);

      const valorDeclaradoFinal = valorDeclarado || Math.min(valorTotal, 10000);

      // Buscar preços dos Correios
      const correios = await this.calcularCorreios(cepOrigem, cepDestino, pesoTotal, valorDeclaradoFinal);
      if (correios.length > 0) opcoes.push(...correios);

      // Buscar preços da Loggi (apenas grandes centros)
      if (await this.loggiAtende(cepDestino)) {
        const loggi = await this.calcularLoggi(cepOrigem, cepDestino, pesoTotal, valorDeclaradoFinal);
        if (loggi.length > 0) opcoes.push(...loggi);
      }

      // Buscar preços via Frenet
      const frenet = await this.calcularFrenet(cepOrigem, cepDestino, pesoTotal, valorDeclaradoFinal);
      if (frenet.length > 0) opcoes.push(...frenet);

      // Aplicar frete grátis se valor mínimo atingido
      if (valorTotal >= 250) {
        opcoes.unshift({
          nome: 'Frete Grátis',
          preco: 0,
          prazo: '5-8 dias úteis',
          servico: 'promocional',
          codigo: 'GRATIS',
          observacoes: 'Válido para pedidos acima de R$ 250,00'
        });
      }

      // Ordenar por preço
      return opcoes.sort((a, b) => a.preco - b.preco);

    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      return this.obterOpcoesPadrao();
    }
  }

  // Calcular frete Correios
  async calcularCorreios(cepOrigem, cepDestino, peso, valorDeclarado) {
    try {
      const servicos = [
        { codigo: '04014', nome: 'SEDEX' },
        { codigo: '04510', nome: 'PAC' }
      ];

      const resultados = [];

      for (const servico of servicos) {
        const url = 'http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx';
        const params = {
          nCdEmpresa: '',
          sDsSenha: '',
          nCdServico: servico.codigo,
          sCepOrigem: cepOrigem.replace(/[^0-9]/g, ''),
          sCepDestino: cepDestino.replace(/[^0-9]/g, ''),
          nVlPeso: peso,
          nCdFormato: 1, // Caixa/Pacote
          nVlComprimento: 30,
          nVlAltura: 15,
          nVlLargura: 20,
          nVlDiametro: 0,
          sCdMaoPropria: 'N',
          nVlValorDeclarado: valorDeclarado,
          sCdAvisoRecebimento: 'N',
          StrRetorno: 'xml',
          nIndicaCalculo: 3
        };

        const response = await axios.get(url, { params });

        // Parse do XML (simplificado)
        if (response.data && !response.data.includes('Erro')) {
          const valor = this.extrairValorXml(response.data, 'Valor');
          const prazo = this.extrairValorXml(response.data, 'PrazoEntrega');

          if (valor && prazo) {
            resultados.push({
              nome: servico.nome,
              preco: parseFloat(valor.replace(',', '.')),
              prazo: `${prazo} dias úteis`,
              servico: 'correios',
              codigo: servico.codigo
            });
          }
        }
      }

      return resultados;
    } catch (error) {
      console.error('Erro Correios:', error);
      return [];
    }
  }

  // Calcular frete Loggi
  async calcularLoggi(cepOrigem, cepDestino, peso, valorDeclarado) {
    try {
      const payload = {
        origin: {
          zipcode: cepOrigem.replace(/[^0-9]/g, '')
        },
        destination: {
          zipcode: cepDestino.replace(/[^0-9]/g, '')
        },
        packages: [{
          weight: peso * 1000, // converter para gramas
          dimensions: {
            width: 20,
            height: 15,
            length: 30
          }
        }],
        declared_value: valorDeclarado
      };

      const response = await axios.post('https://api.loggi.com/v1/quote', payload, {
        headers: {
          'Authorization': `Bearer ${this.loggiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.quotes) {
        return response.data.quotes.map(quote => ({
          nome: `Loggi ${quote.service_name}`,
          preco: quote.price / 100, // centavos para reais
          prazo: quote.delivery_time,
          servico: 'loggi',
          codigo: quote.service_code
        }));
      }

      return [];
    } catch (error) {
      console.error('Erro Loggi:', error);
      return [];
    }
  }

  // Calcular frete via Frenet
  async calcularFrenet(cepOrigem, cepDestino, peso, valorDeclarado) {
    try {
      const payload = {
        SellerCEP: cepOrigem.replace(/[^0-9]/g, ''),
        RecipientCEP: cepDestino.replace(/[^0-9]/g, ''),
        ShipmentInvoiceValue: valorDeclarado,
        Weight: peso,
        Length: 30,
        Width: 20,
        Height: 15,
        Diameter: 0,
        Categories: [{ Name: 'Moda', Value: valorDeclarado }]
      };

      const response = await axios.post('https://api.frenet.com.br/shipping/quote', payload, {
        headers: {
          'token': this.frenetToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.ShippingSevicesArray) {
        return response.data.ShippingSevicesArray
          .filter(service => service.Error === '')
          .map(service => ({
            nome: service.ServiceDescription,
            preco: service.ShippingPrice,
            prazo: `${service.DeliveryTime} dias úteis`,
            servico: 'frenet',
            codigo: service.ServiceCode,
            transportadora: service.Carrier
          }));
      }

      return [];
    } catch (error) {
      console.error('Erro Frenet:', error);
      return [];
    }
  }

  // Verificar se Loggi atende o CEP
  async loggiAtende(cep) {
    const grandesCentros = [
      /^0[1-5]/, // São Paulo
      /^2[0-3]/, // Rio de Janeiro
      /^3[0-1]/, // Belo Horizonte
      /^4[0-2]/, // Curitiba
      /^5[0-2]/, // Porto Alegre
      /^6[0-3]/, // Brasília
      /^7[0-6]/, // Goiânia/Salvador
      /^8[0-7]/, // Fortaleza/Recife
    ];

    const cepNum = cep.replace(/[^0-9]/g, '');
    return grandesCentros.some(regex => regex.test(cepNum));
  }

  // Rastrear pedido
  async rastrearPedido(codigo, servico) {
    switch (servico) {
      case 'correios':
        return await this.rastrearCorreios(codigo);
      case 'loggi':
        return await this.rastrearLoggi(codigo);
      default:
        return { success: false, error: 'Serviço de rastreamento não suportado' };
    }
  }

  // Rastreamento Correios
  async rastrearCorreios(codigo) {
    try {
      const response = await axios.post('https://api.correios.com.br/sroxml', {
        usuario: this.correiosUser,
        senha: this.correiosPassword,
        tipo: 'L',
        resultado: 'T',
        objetos: codigo
      });

      // Parse do XML e extração dos eventos
      const eventos = this.extrairEventosCorreios(response.data);
      return { success: true, eventos };
    } catch (error) {
      console.error('Erro rastreamento Correios:', error);
      return { success: false, error: error.message };
    }
  }

  // Rastreamento Loggi
  async rastrearLoggi(codigo) {
    try {
      const response = await axios.get(`https://api.loggi.com/v1/orders/${codigo}/tracking`, {
        headers: {
          'Authorization': `Bearer ${this.loggiToken}`
        }
      });

      if (response.data && response.data.tracking) {
        return {
          success: true,
          eventos: response.data.tracking.map(event => ({
            data: event.datetime,
            status: event.status,
            descricao: event.description,
            local: event.location
          }))
        };
      }

      return { success: false, error: 'Código não encontrado' };
    } catch (error) {
      console.error('Erro rastreamento Loggi:', error);
      return { success: false, error: error.message };
    }
  }

  // Métodos auxiliares
  extrairValorXml(xml, tag) {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  extrairEventosCorreios(xml) {
    // Implementar parser XML para eventos dos Correios
    // Retornar array de eventos formatados
    return [];
  }

  obterOpcoesPadrao() {
    return [
      {
        nome: 'PAC',
        preco: 15.50,
        prazo: '8-12 dias úteis',
        servico: 'correios',
        codigo: '04510'
      },
      {
        nome: 'SEDEX',
        preco: 25.80,
        prazo: '3-5 dias úteis',
        servico: 'correios',
        codigo: '04014'
      }
    ];
  }

  // Gerar etiqueta de envio
  async gerarEtiqueta(pedido, opcaoFrete) {
    try {
      switch (opcaoFrete.servico) {
        case 'correios':
          return await this.gerarEtiquetaCorreios(pedido, opcaoFrete);
        case 'loggi':
          return await this.gerarEtiquetaLoggi(pedido, opcaoFrete);
        default:
          return { success: false, error: 'Serviço não suportado para etiquetas' };
      }
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error);
      return { success: false, error: error.message };
    }
  }

  async gerarEtiquetaCorreios(pedido, opcaoFrete) {
    // Implementar geração de etiqueta dos Correios
    return {
      success: true,
      etiqueta_url: `https://api.lumosfitness.com/etiquetas/${pedido.id}.pdf`,
      codigo_rastreamento: 'BR123456789BR'
    };
  }

  async gerarEtiquetaLoggi(pedido, opcaoFrete) {
    // Implementar geração de etiqueta da Loggi
    return {
      success: true,
      etiqueta_url: `https://api.lumosfitness.com/etiquetas/${pedido.id}.pdf`,
      codigo_rastreamento: `LG${Date.now()}`
    };
  }
}

module.exports = LogisticsService;
