# Lumos Moda Fitness – Guia de Deploy

Este documento orienta **Mike** (Back-End) e **Nanda** (Front-End) sobre os procedimentos de deployment para os ambientes de **Desenvolvimento**, **Staging** e **Produção**.

---

## Índice

- [Pré-requisitos](#pré-requisitos)  
- [Ambientes](#ambientes)  
- [Deploy Back-End (Mike)](#deploy-back-end-mike)  
  - [Configuração Inicial](#configuração-inicial)  
  - [Build e Containerização](#build-e-containerização)  
  - [Publicação no Staging](#publicação-no-staging)  
  - [Publicação em Produção](#publicação-em-produção)  
- [Deploy Front-End (Nanda)](#deploy-front-end-nanda)  
  - [Build de Produção](#build-de-produção)  
  - [Hospedagem e CDN](#hospedagem-e-cdn)  
  - [Invalidar Cache](#invalidar-cache)  
- [Rollback](#rollback)  
- [Monitoramento Pós-Deploy](#monitoramento-pós-deploy)  
- [Contatos](#contatos)  

---

## Pré-requisitos

- Git configurado com chaves SSH  
- Docker e Docker Compose instalados  
- Node.js v18+ e npm  
- Acesso às credenciais dos serviços (ERP, transportadora, CDN)  
- Variáveis de ambiente configuradas em `.env`  

---

## Ambientes

1. **Desenvolvimento**  
   - Branch: `develop`  
   - URL típica: `[https://lumos-moda-fitness.vercel.app/]`
2. **Staging**  
   - Branch: `release/*` ou tag pré-produção  
   - URL típica: `staging.lumosfitness.com`
3. **Produção**  
   - Branch: `main`  
   - Tag-release: `vX.Y.Z`  
   - URL final: `www.lumosfitness.com`

---

## Deploy Back-End (Mike)

### Configuração Inicial

1. Clone o repositório e acesse a pasta `backend/`:
   ```bash
   git checkout develop
   git pull origin develop
   cd backend
   cp .env.example .env
   # Preencha .env com credenciais reais
   ```

2. Instale dependências:
   ```bash
   npm install
   ```

### Build e Containerização

1. Build da imagem Docker:
   ```bash
   docker-compose build lumos-backend
   ```

2. Verifique a imagem:
   ```bash
   docker images | grep lumos-backend
   ```

### Publicação no Staging

1. Faça checkout na branch de release:
   ```bash
   git checkout release/vX.Y.Z
   git pull origin release/vX.Y.Z
   ```

2. Suba containers em background:
   ```bash
   docker-compose up -d
   ```

3. Verifique logs:
   ```bash
   docker-compose logs -f lumos-backend
   ```

4. Teste endpoints:
   ```bash
   curl https://staging.lumosfitness.com/api/produtos
   ```

### Publicação em Produção

1. Mude para `main`:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Tag e push:
   ```bash
   git tag vX.Y.Z
   git push origin main --tags
   ```

3. Deploy:
   ```bash
   docker-compose up -d
   ```

4. Verifique saúde da API:
   ```bash
   curl https://www.lumosfitness.com/api/health
   ```

---

## Deploy Front-End (Nanda)

### Build de Produção

1. Acesse a pasta `frontend/` e atualize `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   cd frontend
   ```

2. Instale dependências (se houver bundler):
   ```bash
   npm install
   ```

3. Gere a versão otimizada:
   ```bash
   npm run build   # ou yarn build
   ```

### Hospedagem e CDN

1. Faça upload dos arquivos `build/` para o bucket S3 ou servidor estático:
   ```bash
   aws s3 sync build/ s3://lumos-frontend --delete
   ```

2. Atualize as configurações de distribuição (CloudFront):
   ```bash
   aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
   ```

3. Verifique a entrega:
   ```bash
   curl https://www.lumosfitness.com
   ```

### Invalidar Cache

- Sempre que fizer deploy, crie uma invalidação de cache no CDN:
  ```bash
  aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
  ```

---

## Rollback

- **Back-End:**
  ```bash
  git checkout <tag-anterior>
  docker-compose up -d
  ```
- **Front-End:**
  ```bash
  aws s3 sync build-v<versão-anterior>/ s3://lumos-frontend --delete
  aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
  ```

---

## Monitoramento Pós-Deploy

- **Logs:**  
  - `docker-compose logs -f`  
  - CloudWatch / Loggly
- **Métricas:**  
  - API Response Time (<2s)  
  - Erros 4xx/5xx
- **Alertas:**  
  - Configurar alertas de saúde do container  
  - Notificações Slack/Teams via webhook

---
