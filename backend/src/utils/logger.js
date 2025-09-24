const winston = require('winston');
const path = require('path');

// Configurar formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Configurar formato para console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let msg = `${timestamp} [${service || 'app'}] ${level}: ${message}`;
    
    // Adicionar metadados se existirem
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return msg;
  })
);

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Criar logger principal
const createLogger = (service = 'app') => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: { service },
    transports: [
      // Log de erro separado
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      }),
      
      // Log combinado (info e acima)
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      
      // Log de acesso (para requests HTTP)
      new winston.transports.File({
        filename: path.join(logsDir, 'access.log'),
        level: 'http',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ],
    
    // Tratamento de exceções não capturadas
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log')
      })
    ],
    
    // Tratamento de rejeições de Promise não capturadas
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log')
      })
    ]
  });
};

// Logger principal da aplicação
const logger = createLogger('main');

// Adicionar transporte para console apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

// Logger específico para diferentes módulos
const loggers = {
  server: createLogger('server'),
  database: createLogger('database'),
  redis: createLogger('redis'),
  mercadopago: createLogger('mercadopago'),
  omie: createLogger('omie'),
  frete: createLogger('frete'),
  produtos: createLogger('produtos'),
  carrinho: createLogger('carrinho'),
  checkout: createLogger('checkout'),
  auth: createLogger('auth'),
  admin: createLogger('admin'),
  webhook: createLogger('webhook')
};

// Adicionar console para todos os loggers em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  Object.values(loggers).forEach(serviceLogger => {
    serviceLogger.add(
      new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
      })
    );
  });
}

// Middleware para logging de requests HTTP
const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Stream para Morgan
const morganStream = {
  write: (message) => {
    httpLogger.http(message.trim());
  }
};

// Função para sanitizar dados sensíveis nos logs
const sanitizeLogData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveKeys = [
    'password', 'senha', 'token', 'cpf', 'credit_card', 
    'card_number', 'cvv', 'access_token', 'refresh_token',
    'authorization', 'cookie', 'session'
  ];
  
  const sanitized = { ...data };
  
  const sanitizeRecursive = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeRecursive(obj[key]);
        }
      }
    }
  };
  
  sanitizeRecursive(sanitized);
  return sanitized;
};

// Função para criar log de auditoria
const auditLog = (action, user, resource, details = {}) => {
  const auditLogger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'audit.log'),
        maxsize: 5242880,
        maxFiles: 10
      })
    ]
  });
  
  auditLogger.info('AUDIT', {
    action,
    user: sanitizeLogData(user),
    resource,
    details: sanitizeLogData(details),
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown'
  });
};

// Função para log de performance
const performanceLog = (operation, duration, details = {}) => {
  const performanceLogger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'performance.log'),
        maxsize: 5242880,
        maxFiles: 5
      })
    ]
  });
  
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  
  performanceLogger[level]('PERFORMANCE', {
    operation,
    duration: `${duration}ms`,
    details: sanitizeLogData(details),
    timestamp: new Date().toISOString()
  });
};

// Função para log de segurança
const securityLog = (event, severity, details = {}) => {
  const securityLogger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'security.log'),
        maxsize: 5242880,
        maxFiles: 10
      })
    ]
  });
  
  const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
  
  securityLogger[level]('SECURITY', {
    event,
    severity,
    details: sanitizeLogData(details),
    timestamp: new Date().toISOString()
  });
};

// Função para obter estatísticas de logs
const getLogStats = () => {
  const stats = {
    totalLogs: 0,
    errorLogs: 0,
    warningLogs: 0,
    infoLogs: 0,
    debugLogs: 0,
    lastUpdated: new Date().toISOString()
  };
  
  // Esta é uma implementação básica
  // Em produção, você poderia usar ferramentas como ELK Stack
  try {
    const logFiles = [
      'combined.log',
      'error.log',
      'access.log',
      'audit.log',
      'performance.log',
      'security.log'
    ];
    
    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        stats[file] = {
          size: fileStats.size,
          lastModified: fileStats.mtime
        };
      }
    });
  } catch (error) {
    logger.error('Erro ao obter estatísticas de logs:', error);
  }
  
  return stats;
};

// Timer para medir performance
class PerformanceTimer {
  constructor(operation) {
    this.operation = operation;
    this.startTime = Date.now();
  }
  
  end(details = {}) {
    const duration = Date.now() - this.startTime;
    performanceLog(this.operation, duration, details);
    return duration;
  }
}

// Função para criar timer de performance
const startTimer = (operation) => {
  return new PerformanceTimer(operation);
};

module.exports = {
  createLogger,
  logger,
  loggers,
  morganStream,
  sanitizeLogData,
  auditLog,
  performanceLog,
  securityLog,
  getLogStats,
  startTimer,
  httpLogger
};