const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createLogger } = require('./utils/logger');
const database = require('./database/connection');
const redisClient = require('./cache/redis');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const healthCheck = require('./middleware/healthCheck');

// Importar rotas
const authRoutes = require('./routes/auth');
const produtoRoutes = require('./routes/produtos');
const carrinhoRoutes = require('./routes/carrinho');
const checkoutRoutes = require('./routes/checkout');
const freteRoutes = require('./routes/frete');
const adminRoutes = require('./routes/admin');
const clienteRoutes = require('./routes/clientes');
const pedidoRoutes = require('./routes/pedidos');
const webhookRoutes = require('./routes/webhooks');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('server');

// ============= MIDDLEWARES DE SEGURANÇA =============
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://sdk.mercadopago.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mercadopago.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
    status: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit mais rigoroso para checkout
const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // máximo 3 tentativas de checkout
  message: {
    error: 'Muitas tentativas de checkout. Aguarde 5 minutos.',
    status: 429
  }
});

app.use('/api/', limiter);
app.use('/api/checkout', checkoutLimiter);

// ============= MIDDLEWARES GERAIS =============
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://lumosfitness.github.io',
      'https://lumos-moda-fitness.vercel.app'
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para parsing JSON com limite de tamanho
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy (importante para rate limiting em produção)
app.set('trust proxy', 1);

// ============= HEALTH CHECK =============
app.use('/api/health', healthCheck);

// ============= ROTAS DA API =============
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtoRoutes);
app.use('/api/carrinho', carrinhoRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/frete', freteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/webhooks', webhookRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Lumos Moda Fitness API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    docs: '/api/health'
  });
});

// ============= MIDDLEWARES DE ERRO =============
app.use(notFoundHandler);
app.use(errorHandler);

// ============= INICIALIZAÇÃO DO SERVIDOR =============
const startServer = async () => {
  try {
    // Conectar ao banco de dados
    await database.testConnection();
    logger.info('✅ Conexão com PostgreSQL estabelecida');

    // Conectar ao Redis
    try {
      await redisClient.ping();
      logger.info('✅ Conexão com Redis estabelecida');
    } catch (redisError) {
      logger.warn('⚠️  Redis não disponível. Cache desabilitado.', { error: redisError.message });
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor Lumos API rodando na porta ${PORT}`);
      logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📚 API Base: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} recebido. Iniciando graceful shutdown...`);
      
      server.close(async () => {
        logger.info('Servidor HTTP fechado.');
        
        try {
          await database.closeConnection();
          logger.info('Conexão com PostgreSQL fechada.');
        } catch (error) {
          logger.error('Erro ao fechar conexão com PostgreSQL:', error);
        }

        try {
          await redisClient.quit();
          logger.info('Conexão com Redis fechada.');
        } catch (error) {
          logger.error('Erro ao fechar conexão com Redis:', error);
        }

        process.exit(0);
      });

      // Forçar shutdown após 30 segundos
      setTimeout(() => {
        logger.error('Forcando shutdown após timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor apenas se não estamos em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;