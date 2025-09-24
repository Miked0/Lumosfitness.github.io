# ============= MULTI-STAGE BUILD =============

# Estágio 1: Build
FROM node:18-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache python3 make g++ \
    && apk add --no-cache --virtual .gyp python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production \
    && npm cache clean --force

# Limpar dependências de build
RUN apk del .gyp

# ============= STAGE 2: PRODUÇÃO =============

FROM node:18-alpine AS production

# Instalar dependências do sistema
RUN apk add --no-cache \
    ca-certificates \
    curl \
    tini \
    && update-ca-certificates

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs \
    && adduser -S lumos -u 1001 -G nodejs

# Definir diretório de trabalho
WORKDIR /app

# Copiar node_modules do estágio builder
COPY --from=builder --chown=lumos:nodejs /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=lumos:nodejs . .

# Criar diretórios necessários
RUN mkdir -p logs uploads temp \
    && chown -R lumos:nodejs logs uploads temp

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Expor porta
EXPOSE 3001

# Mudar para usuário não-root
USER lumos

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/api/health/simple || exit 1

# Usar tini como init system
ENTRYPOINT ["/sbin/tini", "--"]

# Comando para iniciar a aplicação
CMD ["npm", "start"]

# ============= LABELS PARA METADADOS =============

LABEL maintainer="SID - NEW AGE <dev@lumosfitness.com>"
LABEL version="1.0.0"
LABEL description="Backend API para Lumos Moda Fitness E-commerce"
LABEL org.opencontainers.image.title="Lumos Backend API"
LABEL org.opencontainers.image.description="API RESTful para e-commerce de moda fitness"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="SID - NEW AGE"
LABEL org.opencontainers.image.url="https://lumosfitness.com"
LABEL org.opencontainers.image.documentation="https://github.com/Miked0/Lumosfitness.github.io/blob/main/backend/README.md"
LABEL org.opencontainers.image.source="https://github.com/Miked0/Lumosfitness.github.io"
LABEL org.opencontainers.image.licenses="Proprietary"