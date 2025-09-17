#!/bin/bash

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
