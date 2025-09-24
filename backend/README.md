# 🚀 Lumos Fitness - Backend API

**API RESTful completa para e-commerce de moda fitness**

## 📋 Sobre

Este é o backend da plataforma Lumos Fitness, desenvolvido em Node.js com Express.js, fornecendo uma API RESTful robusta para o e-commerce de moda fitness feminina.

### ✨ Características Principais

- 🔐 **Autenticação JWT** com refresh tokens
- 🛡️ **Segurança avançada** com rate limiting e validação
- 📦 **Cache Redis** para performance
- 💳 **Integração Mercado Pago** completa
- 📊 **Integração Omie ERP** para gestão
- 🚚 **Múltiplas transportadoras** para frete
- 📝 **Logging completo** com Winston
- 🏥 **Health checks** para monitoramento
- 🐳 **Docker** ready

## 🛠️ Stack Tecnológica

### Core
- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática (opcional)
- **PostgreSQL** - Banco de dados principal
- **Redis** - Cache e sessões

### Segurança
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **Helmet** - Headers de segurança
- **express-rate-limit** - Rate limiting
- **express-validator** - Validação de dados

### Integrações
- **Mercado Pago SDK** - Pagamentos
- **Axios** - Cliente HTTP
- **Nodemailer** - Envio de emails

### Monitoramento
- **Winston** - Logging
- **Morgan** - HTTP logging
- **Joi** - Validação de schemas

## 🚀 Início Rápido

### Pré-requisitos

```bash
# Versões mínimas
Node.js >= 18.0.0
npm >= 8.0.0
PostgreSQL >= 13
Redis >= 6 (opcional)
```

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/Miked0/Lumosfitness.github.io.git
cd Lumosfitness.github.io/backend

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# 4. Execute as migrações do banco
npm run db:migrate

# 5. Popule com dados iniciais
npm run db:seed

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

### Docker (Recomendado)

```bash
# Desenvolvimento com Docker Compose
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f backend
```

## 📡 Endpoints da API

### Autenticação
```http
POST   /api/auth/login          # Login
POST   /api/auth/refresh        # Renovar token
POST   /api/auth/logout         # Logout
GET    /api/auth/me            # Dados do usuário
GET    /api/auth/sessions      # Sessões ativas
```

### Produtos
```http
GET    /api/produtos                    # Listar produtos
GET    /api/produtos/:id               # Obter produto
GET    /api/produtos/categoria/:cat    # Por categoria
GET    /api/produtos/buscar/:termo     # Buscar produtos
GET    /api/produtos/em-destaque       # Produtos destaque
GET    /api/produtos/meta/categorias   # Listar categorias
GET    /api/produtos/:id/relacionados  # Produtos relacionados
```

### Carrinho
```http
GET    /api/carrinho/:sessionId                    # Obter carrinho
POST   /api/carrinho/:sessionId/adicionar         # Adicionar item
PUT    /api/carrinho/:sessionId/item/:itemId      # Atualizar item
DELETE /api/carrinho/:sessionId/item/:itemId     # Remover item
DELETE /api/carrinho/:sessionId                  # Limpar carrinho
GET    /api/carrinho/:sessionId/resumo            # Resumo do carrinho
```

### Checkout
```http
POST   /api/checkout/processar         # Processar pedido
POST   /api/checkout/validar          # Validar dados
GET    /api/checkout/resumo/:sessionId # Resumo do checkout
```

### Frete
```http
POST   /api/frete/calcular            # Calcular frete
GET    /api/frete/servicos            # Listar serviços
```

### Admin (Requer autenticação)
```http
GET    /api/admin/dashboard           # Dashboard
GET    /api/admin/vendas             # Relatório vendas
GET    /api/admin/estoque            # Controle estoque
GET    /api/admin/clientes           # Gestão clientes
```

### Webhooks
```http
POST   /api/webhooks/mercadopago     # Webhook Mercado Pago
POST   /api/webhooks/omie            # Webhook Omie
```

### Monitoramento
```http
GET    /api/health                   # Health check completo
GET    /api/health/simple            # Health check simples
GET    /api/health/ready            # Readiness probe
GET    /api/health/live             # Liveness probe
GET    /api/health/metrics          # Métricas detalhadas
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

```sql
-- Produtos
CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100),
  preco DECIMAL(10,2) NOT NULL,
  preco_original DECIMAL(10,2),
  tamanhos JSONB,
  cores JSONB,
  estoque INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  destaque BOOLEAN DEFAULT FALSE,
  omie_id VARCHAR(50),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clientes
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  cpf VARCHAR(14) UNIQUE,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  status VARCHAR(50) DEFAULT 'pendente',
  subtotal DECIMAL(10,2) NOT NULL,
  frete DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  metodo_pagamento VARCHAR(50),
  mp_payment_id VARCHAR(100),
  omie_id VARCHAR(50),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuração

### Variáveis de Ambiente Essenciais

```bash
# Básico
NODE_ENV=production
PORT=3001
API_URL=https://api.lumosfitness.com
FRONTEND_URL=https://lumosfitness.com

# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=sua_chave_super_secreta

# Mercado Pago
MP_ACCESS_TOKEN=seu_token
MP_PUBLIC_KEY=sua_chave_publica

# Omie ERP
OMIE_APP_KEY=sua_app_key
OMIE_APP_SECRET=seu_app_secret
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Cobertura de código
npm run test:coverage

# Testes de integração
npm run test:integration
```

## 📊 Monitoramento e Logs

### Estrutura de Logs

```
logs/
├── combined.log      # Todos os logs
├── error.log         # Apenas erros
├── access.log        # Requisições HTTP
├── audit.log         # Auditoria
├── performance.log   # Performance
├── security.log      # Segurança
└── exceptions.log    # Exceções não tratadas
```

### Health Checks

```bash
# Health check básico
curl http://localhost:3001/api/health

# Métricas detalhadas
curl http://localhost:3001/api/health/metrics
```

## 🚀 Deploy

### Produção com Docker

```bash
# Build da imagem
docker build -t lumos-backend .

# Executar container
docker run -d \
  --name lumos-backend \
  -p 3001:3001 \
  --env-file .env.production \
  lumos-backend
```

### Deploy com Docker Compose

```bash
# Produção
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps
```

### Checklist de Deploy

- [ ] Configurar variáveis de ambiente
- [ ] Executar migrações do banco
- [ ] Configurar HTTPS/SSL
- [ ] Configurar backup automático
- [ ] Configurar monitoramento
- [ ] Testar health checks
- [ ] Configurar alertas

## 🔐 Segurança

### Medidas Implementadas

- ✅ **HTTPS obrigatório** em produção
- ✅ **Rate limiting** por IP
- ✅ **Validação rigorosa** de entrada
- ✅ **Sanitização** de dados
- ✅ **Headers de segurança** (Helmet)
- ✅ **Tokens JWT** com expiração
- ✅ **Blacklist de tokens**
- ✅ **Logging de auditoria**
- ✅ **Proteção CORS**
- ✅ **Validação de CPF**

### Configurações Recomendadas

```javascript
// Exemplo de configuração de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

## 📈 Performance

### Otimizações Implementadas

- ⚡ **Cache Redis** para consultas frequentes
- ⚡ **Pool de conexões** PostgreSQL
- ⚡ **Compressão gzip** de respostas
- ⚡ **Paginação** em listagens
- ⚡ **Índices otimizados** no banco
- ⚡ **Lazy loading** de dados

### Métricas de Performance

```bash
# Tempo de resposta médio: < 200ms
# Throughput: > 1000 req/s
# Uptime: > 99.9%
# Memory usage: < 512MB
```

## 🤝 Contribuição

### Fluxo de Desenvolvimento

1. **Fork** o repositório
2. **Clone** seu fork
3. **Crie** uma branch: `git checkout -b feature/nova-funcionalidade`
4. **Commit**: `git commit -m 'feat: adiciona nova funcionalidade'`
5. **Push**: `git push origin feature/nova-funcionalidade`
6. **Pull Request** para a branch `main`

### Padrões de Código

```bash
# Linting
npm run lint

# Formatação
npm run format

# Verificação de tipos
npm run type-check
```

## 📚 Documentação Adicional

- [Guia de Integração Mercado Pago](./docs/mercado-pago.md)
- [Configuração Omie ERP](./docs/omie-integration.md)
- [Manual de Deploy](./docs/deployment.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🆘 Suporte

### Problemas Comuns

**Erro de conexão com banco:**
```bash
# Verificar se PostgreSQL está rodando
pg_isready -h localhost -p 5432

# Testar conexão
psql -h localhost -U postgres -d lumos_db
```

**Redis não conecta:**
```bash
# Verificar se Redis está ativo
redis-cli ping

# Verificar configuração
echo $REDIS_URL
```

### Contato

- 📧 **Email**: dev@lumosfitness.com
- 💬 **Slack**: #lumos-dev
- 🐛 **Issues**: [GitHub Issues](https://github.com/Miked0/Lumosfitness.github.io/issues)

## 📄 Licença

Copyright © 2024 Lumos Moda Fitness. Todos os direitos reservados.

**Desenvolvido com ❤️ pela equipe SID - NEW AGE**

---

*"Luz que inspira movimento" - Transformando o e-commerce através da tecnologia*