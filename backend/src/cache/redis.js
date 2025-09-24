const redis = require('redis');
const { createLogger } = require('../utils/logger');

const logger = createLogger('redis');

// Configuração do cliente Redis
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000
});

// Event handlers
client.on('connect', () => {
  logger.info('Conectando ao Redis...');
});

client.on('ready', () => {
  logger.info('✅ Redis pronto para uso');
});

client.on('error', (err) => {
  logger.error('Erro no Redis:', err);
});

client.on('end', () => {
  logger.info('Conexão com Redis encerrada');
});

client.on('reconnecting', () => {
  logger.warn('Reconectando ao Redis...');
});

// Conectar ao Redis
const connectRedis = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com Redis:', error);
    return false;
  }
};

// Funções helper para cache
const cache = {
  // Definir valor no cache com TTL (em segundos)
  set: async (key, value, ttl = 3600) => {
    try {
      await connectRedis();
      const serializedValue = JSON.stringify(value);
      await client.setEx(key, ttl, serializedValue);
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Erro ao definir cache para chave ${key}:`, error);
      return false;
    }
  },

  // Obter valor do cache
  get: async (key) => {
    try {
      await connectRedis();
      const value = await client.get(key);
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Erro ao obter cache para chave ${key}:`, error);
      return null;
    }
  },

  // Deletar valor do cache
  del: async (key) => {
    try {
      await connectRedis();
      const result = await client.del(key);
      logger.debug(`Cache DEL: ${key} (deleted: ${result})`);
      return result > 0;
    } catch (error) {
      logger.error(`Erro ao deletar cache para chave ${key}:`, error);
      return false;
    }
  },

  // Verificar se chave existe
  exists: async (key) => {
    try {
      await connectRedis();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Erro ao verificar existência da chave ${key}:`, error);
      return false;
    }
  },

  // Incrementar valor numérico
  incr: async (key, ttl = 3600) => {
    try {
      await connectRedis();
      const result = await client.incr(key);
      if (result === 1) {
        await client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error(`Erro ao incrementar chave ${key}:`, error);
      return 0;
    }
  },

  // Definir TTL para chave existente
  expire: async (key, ttl) => {
    try {
      await connectRedis();
      return await client.expire(key, ttl);
    } catch (error) {
      logger.error(`Erro ao definir TTL para chave ${key}:`, error);
      return false;
    }
  },

  // Obter tempo restante de TTL
  ttl: async (key) => {
    try {
      await connectRedis();
      return await client.ttl(key);
    } catch (error) {
      logger.error(`Erro ao obter TTL da chave ${key}:`, error);
      return -1;
    }
  }
};

// Funções específicas para carrinho
const carrinho = {
  // Salvar carrinho de compras
  save: async (sessionId, cartData) => {
    const key = `cart:${sessionId}`;
    return await cache.set(key, cartData, 24 * 60 * 60); // 24 horas
  },

  // Obter carrinho de compras
  get: async (sessionId) => {
    const key = `cart:${sessionId}`;
    return await cache.get(key);
  },

  // Remover carrinho
  remove: async (sessionId) => {
    const key = `cart:${sessionId}`;
    return await cache.del(key);
  },

  // Atualizar TTL do carrinho
  extendTTL: async (sessionId) => {
    const key = `cart:${sessionId}`;
    return await cache.expire(key, 24 * 60 * 60);
  }
};

// Funções para rate limiting
const rateLimit = {
  // Incrementar contador de tentativas
  increment: async (identifier, windowSeconds = 300) => {
    const key = `rate:${identifier}`;
    return await cache.incr(key, windowSeconds);
  },

  // Obter contador atual
  get: async (identifier) => {
    const key = `rate:${identifier}`;
    const value = await cache.get(key);
    return value || 0;
  },

  // Resetar contador
  reset: async (identifier) => {
    const key = `rate:${identifier}`;
    return await cache.del(key);
  }
};

// Funções para sessões de usuário
const session = {
  // Salvar sessão de usuário
  save: async (sessionId, userData, ttl = 7 * 24 * 60 * 60) => {
    const key = `session:${sessionId}`;
    return await cache.set(key, userData, ttl); // 7 dias
  },

  // Obter sessão de usuário
  get: async (sessionId) => {
    const key = `session:${sessionId}`;
    return await cache.get(key);
  },

  // Remover sessão
  remove: async (sessionId) => {
    const key = `session:${sessionId}`;
    return await cache.del(key);
  },

  // Estender sessão
  extend: async (sessionId, ttl = 7 * 24 * 60 * 60) => {
    const key = `session:${sessionId}`;
    return await cache.expire(key, ttl);
  }
};

// Funções para cache de produtos
const produtos = {
  // Cache de lista de produtos
  setList: async (filters, productList, ttl = 300) => {
    const key = `products:list:${Buffer.from(JSON.stringify(filters)).toString('base64')}`;
    return await cache.set(key, productList, ttl); // 5 minutos
  },

  // Obter lista cacheada
  getList: async (filters) => {
    const key = `products:list:${Buffer.from(JSON.stringify(filters)).toString('base64')}`;
    return await cache.get(key);
  },

  // Cache de produto individual
  setProduct: async (productId, productData, ttl = 600) => {
    const key = `product:${productId}`;
    return await cache.set(key, productData, ttl); // 10 minutos
  },

  // Obter produto cacheado
  getProduct: async (productId) => {
    const key = `product:${productId}`;
    return await cache.get(key);
  },

  // Invalidar cache de produto
  invalidateProduct: async (productId) => {
    const key = `product:${productId}`;
    return await cache.del(key);
  },

  // Invalidar todos os caches de produtos
  invalidateAll: async () => {
    try {
      await connectRedis();
      const keys = await client.keys('product*');
      if (keys.length > 0) {
        await client.del(keys);
        logger.info(`Invalidados ${keys.length} caches de produtos`);
      }
      return true;
    } catch (error) {
      logger.error('Erro ao invalidar caches de produtos:', error);
      return false;
    }
  }
};

// Statísticas do Redis
const getStats = async () => {
  try {
    await connectRedis();
    const info = await client.info('memory');
    const stats = {};
    
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    });
    
    return {
      connected: client.isOpen,
      memory: stats,
      keyspace: await client.info('keyspace')
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas do Redis:', error);
    return { connected: false, error: error.message };
  }
};

// Função para fechar conexão
const closeConnection = async () => {
  try {
    if (client.isOpen) {
      await client.quit();
      logger.info('Conexão com Redis fechada');
    }
  } catch (error) {
    logger.error('Erro ao fechar conexão com Redis:', error);
    throw error;
  }
};

module.exports = {
  client,
  connectRedis,
  cache,
  carrinho,
  rateLimit,
  session,
  produtos,
  getStats,
  closeConnection,
  ping: () => client.ping()
};