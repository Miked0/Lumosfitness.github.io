# Package.json para o backend
package_json = """{
  "name": "lumos-backend",
  "version": "1.0.0",
  "description": "Backend API para Lumos Moda Fitness",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "helmet": "^6.1.5",
    "morgan": "^1.10.0",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0"
  },
  "keywords": ["ecommerce", "fitness", "api", "nodejs"],
  "author": "SID - NEW AGE",
  "license": "MIT"
}"""

with open('package.json', 'w', encoding='utf-8') as f:
    f.write(package_json)

print("✅ Package.json criado!")

# Dockerfile para containerização
dockerfile = """FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]"""

with open('Dockerfile', 'w', encoding='utf-8') as f:
    f.write(dockerfile)

print("✅ Dockerfile criado!")

# Docker Compose para ambiente completo
docker_compose = """version: '3.8'

services:
  lumos-backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=lumos_secret_key_2024
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  lumos-database:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=lumos2024
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  lumos-redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:"""

with open('docker-compose.yml', 'w', encoding='utf-8') as f:
    f.write(docker_compose)

print("✅ Docker Compose criado!")