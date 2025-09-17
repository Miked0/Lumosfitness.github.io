# API Lumos Moda Fitness - Documentação

## Endpoints Principais

### Produtos
- `GET /api/produtos` - Lista todos os produtos
  - Query params: `categoria`, `busca`
- `GET /api/produtos/:id` - Detalhes de um produto

### Checkout e Pedidos  
- `POST /api/checkout` - Finalizar compra
- `POST /api/frete` - Calcular frete

### Administração
- `GET /api/admin/relatorio-vendas` - Relatório de vendas
- `GET /api/admin/estoque` - Controle de estoque

## Integrações

### ERP Integration
A integração com ERP é realizada através da função `integracaoERP()` que:
- Envia dados do pedido para o sistema ERP
- Gera código de cliente automaticamente
- Formata itens conforme padrão do ERP
- Registra forma de pagamento

### Logística Integration
A integração logística através da função `integracaoLogistica()`:
- Gera código de rastreio
- Envia dados para transportadora
- Calcula prazo de entrega
- Configura instruções especiais

## Segurança
- CORS configurado
- Validação de dados de entrada
- Controle de estoque automático
- Headers de segurança com Helmet

## Deployment
```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Produção
npm start

# Docker
docker-compose up -d
```
