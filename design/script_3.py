# Documentação da API
api_docs = """# API Lumos Moda Fitness - Documentação

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
"""

with open('API_DOCS.md', 'w', encoding='utf-8') as f:
    f.write(api_docs)

print("✅ Documentação da API criada!")

# Scripts de deploy e configuração
deploy_script = """#!/bin/bash

# Script de Deploy Lumos Moda Fitness
echo "🚀 Iniciando deploy da Lumos Moda Fitness..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instalando..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# Fazer build das imagens
echo "📦 Construindo imagens Docker..."
docker-compose build

# Subir serviços
echo "🔄 Iniciando serviços..."
docker-compose up -d

# Verificar status
echo "✅ Verificando status dos serviços..."
docker-compose ps

# Logs
echo "📋 Logs dos últimos minutos:"
docker-compose logs --tail=50

echo "🎉 Deploy concluído!"
echo "🌐 Frontend: Arquivo index.html"
echo "🔌 Backend API: http://localhost:3000"
echo "🗄️ MongoDB: localhost:27017"
echo "⚡ Redis: localhost:6379"
"""

with open('deploy.sh', 'w', encoding='utf-8') as f:
    f.write(deploy_script)

print("✅ Script de deploy criado!")

# Arquivo de configuração para produção
env_example = """# Configurações de Ambiente - Lumos Backend

# Servidor
NODE_ENV=production
PORT=3000

# Banco de dados
MONGODB_URI=mongodb://admin:lumos2024@localhost:27017/lumos_db
REDIS_URL=redis://localhost:6379

# Autenticação
JWT_SECRET=lumos_jwt_secret_key_super_secure_2024
JWT_EXPIRES_IN=7d

# Integrações
ERP_API_URL=https://erp-cliente.com/api/v1
ERP_API_KEY=your_erp_api_key_here
ERP_TIMEOUT=30000

# Logística
CORREIOS_API_KEY=your_correios_api_key
TRANSPORTADORA_API_URL=https://api-transportadora.com/v2
TRANSPORTADORA_TOKEN=your_transportadora_token

# Pagamento
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
PAGSEGURO_EMAIL=your_pagseguro_email
PAGSEGURO_TOKEN=your_pagseguro_token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@lumosfitness.com
SMTP_PASS=your_email_password

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache
CACHE_TTL=3600
"""

with open('.env.example', 'w', encoding='utf-8') as f:
    f.write(env_example)

print("✅ Arquivo .env.example criado!")