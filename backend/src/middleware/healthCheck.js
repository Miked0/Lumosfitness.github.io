const { query, getPoolStats } = require('../database/connection');
const { getStats: getRedisStats } = require('../cache/redis');
const { createLogger } = require('../utils/logger');
const mercadoPagoService = require('../services/mercadoPago');

const logger = createLogger('health');

/**
 * Middleware de health check completo
 */
const healthCheck = async (req, res) => {
  const startTime = Date.now();
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    services: {},
    system: {}
  };

  try {
    // 1. Verificar banco de dados PostgreSQL
    try {
      const dbStart = Date.now();
      const dbResult = await query('SELECT NOW() as timestamp, version() as version');
      const dbDuration = Date.now() - dbStart;
      
      const poolStats = getPoolStats();
      
      checks.services.database = {
        status: 'healthy',
        responseTime: `${dbDuration}ms`,
        version: dbResult.rows[0].version.split(' ')[0],
        timestamp: dbResult.rows[0].timestamp,
        pool: {
          total: poolStats.totalCount,
          idle: poolStats.idleCount,
          waiting: poolStats.waitingCount
        }
      };
    } catch (dbError) {
      checks.services.database = {
        status: 'unhealthy',
        error: dbError.message,
        code: dbError.code
      };
      checks.status = 'degraded';
    }

    // 2. Verificar Redis
    try {
      const redisStart = Date.now();
      const redisStats = await getRedisStats();
      const redisDuration = Date.now() - redisStart;
      
      checks.services.redis = {
        status: redisStats.connected ? 'healthy' : 'unhealthy',
        responseTime: `${redisDuration}ms`,
        connected: redisStats.connected,
        memory: redisStats.memory,
        keyspace: redisStats.keyspace
      };
      
      if (!redisStats.connected) {
        checks.status = 'degraded';
      }
    } catch (redisError) {
      checks.services.redis = {
        status: 'unhealthy',
        error: redisError.message
      };
      checks.status = 'degraded';
    }

    // 3. Verificar Mercado Pago (opcional)
    try {
      const mpStart = Date.now();
      const mpValid = mercadoPagoService.validarConfiguracao();
      const mpDuration = Date.now() - mpStart;
      
      checks.services.mercadoPago = {
        status: mpValid ? 'healthy' : 'misconfigured',
        responseTime: `${mpDuration}ms`,
        configured: mpValid
      };
    } catch (mpError) {
      checks.services.mercadoPago = {
        status: 'misconfigured',
        error: mpError.message
      };
    }

    // 4. Verificar sistema
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    checks.system = {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };

    // 5. Verificar dependências críticas
    checks.dependencies = {
      critical: {
        database: checks.services.database.status === 'healthy',
        redis: checks.services.redis.status !== 'unhealthy' // Redis é opcional
      },
      optional: {
        mercadoPago: checks.services.mercadoPago?.status === 'healthy'
      }
    };

    // 6. Verificar espaço em disco (se possível)
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      checks.system.diskSpace = {
        available: 'N/A', // Implementar se necessário
        lastModified: stats.mtime
      };
    } catch (diskError) {
      // Ignorar erro de disco
    }

    // 7. Definir status geral
    const criticalDown = !checks.dependencies.critical.database;
    
    if (criticalDown) {
      checks.status = 'unhealthy';
    } else if (checks.status !== 'degraded') {
      checks.status = 'healthy';
    }

    // 8. Tempo total de resposta
    const totalDuration = Date.now() - startTime;
    checks.responseTime = `${totalDuration}ms`;

    // 9. Determinar código de status HTTP
    let httpStatus = 200;
    if (checks.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    } else if (checks.status === 'degraded') {
      httpStatus = 200; // OK mas com avisos
    }

    // Log do health check
    logger.info(`Health check executado: ${checks.status}`, {
      status: checks.status,
      responseTime: checks.responseTime,
      services: Object.keys(checks.services).map(service => ({
        name: service,
        status: checks.services[service].status
      }))
    });

    res.status(httpStatus).json(checks);

  } catch (error) {
    logger.error('Erro no health check:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: 'Erro interno no health check',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      responseTime: `${Date.now() - startTime}ms`
    });
  }
};

/**
 * Health check simplificado (apenas status)
 */
const simpleHealthCheck = async (req, res) => {
  try {
    // Teste rápido do banco
    await query('SELECT 1');
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Database unavailable'
    });
  }
};

/**
 * Health check para readiness (Kubernetes)
 */
const readinessCheck = async (req, res) => {
  try {
    // Verificar se aplicação está pronta para receber tráfego
    await query('SELECT 1');
    
    // Verificar se Redis está responsivo (se configurado)
    try {
      const redisStats = await getRedisStats();
      if (!redisStats.connected && process.env.REDIS_REQUIRED === 'true') {
        throw new Error('Redis required but not connected');
      }
    } catch (redisError) {
      if (process.env.REDIS_REQUIRED === 'true') {
        throw redisError;
      }
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

/**
 * Health check para liveness (Kubernetes)
 */
const livenessCheck = async (req, res) => {
  // Verificação simples se o processo ainda está vivo
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Verificar se não há vazamento de memória crítico
  const memoryThreshold = 1024 * 1024 * 1024; // 1GB
  const uptimeThreshold = 24 * 60 * 60; // 24 horas
  
  if (memoryUsage.heapUsed > memoryThreshold && uptime > uptimeThreshold) {
    logger.warn('Possível vazamento de memória detectado', {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      uptime: `${Math.round(uptime / 60 / 60)}h`
    });
  }
  
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    }
  });
};

/**
 * Métricas detalhadas para monitoramento
 */
const metricsCheck = async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Coletar métricas do sistema
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Métricas do banco de dados
    const dbStats = getPoolStats();
    
    // Métricas do Redis
    let redisMetrics = null;
    try {
      redisMetrics = await getRedisStats();
    } catch (error) {
      redisMetrics = { error: error.message };
    }
    
    // Métricas de negócio (exemplo)
    let businessMetrics = {};
    try {
      const businessResult = await query(`
        SELECT 
          (SELECT COUNT(*) FROM produtos WHERE ativo = true) as produtos_ativos,
          (SELECT COUNT(*) FROM pedidos WHERE created_at > NOW() - INTERVAL '24 hours') as pedidos_24h,
          (SELECT COUNT(*) FROM clientes WHERE ativo = true) as clientes_ativos
      `);
      
      if (businessResult.rows.length > 0) {
        businessMetrics = businessResult.rows[0];
      }
    } catch (error) {
      businessMetrics = { error: error.message };
    }
    
    const metrics = {
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      system: {
        uptime: process.uptime(),
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        nodeVersion: process.version,
        pid: process.pid
      },
      database: {
        pool: dbStats,
        connected: true // Se chegou até aqui, está conectado
      },
      redis: redisMetrics,
      business: businessMetrics
    };
    
    res.status(200).json(metrics);
    
  } catch (error) {
    logger.error('Erro ao coletar métricas:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: {
        message: 'Erro ao coletar métricas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

module.exports = {
  healthCheck,
  simpleHealthCheck,
  readinessCheck,
  livenessCheck,
  metricsCheck
};