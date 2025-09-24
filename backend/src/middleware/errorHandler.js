const { createLogger } = require('../utils/logger');

const logger = createLogger('error');

/**
 * Middleware principal de tratamento de erros
 */
const errorHandler = (err, req, res, next) => {
  // Se response já foi enviado, delegar para o Express
  if (res.headersSent) {
    return next(err);
  }

  // Log do erro
  const errorInfo = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    body: req.body ? sanitizeBody(req.body) : undefined,
    query: req.query,
    params: req.params
  };

  // Determinar nível de severidade
  const severity = determineSeverity(err);
  
  if (severity === 'critical') {
    logger.error('Erro crítico capturado:', errorInfo);
  } else if (severity === 'high') {
    logger.error('Erro grave capturado:', errorInfo);
  } else {
    logger.warn('Erro capturado:', errorInfo);
  }

  // Construir resposta de erro
  const errorResponse = buildErrorResponse(err, req);
  
  res.status(errorResponse.statusCode).json(errorResponse.body);
};

/**
 * Determinar severidade do erro
 */
const determineSeverity = (err) => {
  // Erros críticos
  if (err.code === 'ECONNREFUSED' || 
      err.code === 'ENOTFOUND' ||
      err.name === 'DatabaseError' ||
      err.message.includes('FATAL')) {
    return 'critical';
  }
  
  // Erros graves
  if (err.statusCode >= 500 ||
      err.name === 'ValidationError' ||
      err.name === 'CastError' ||
      err.code === 'LIMIT_EXCEEDED') {
    return 'high';
  }
  
  // Erros médios/baixos
  return 'medium';
};

/**
 * Construir resposta de erro baseada no tipo
 */
const buildErrorResponse = (err, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Erro de validação
  if (err.name === 'ValidationError') {
    return {
      statusCode: 400,
      body: {
        success: false,
        message: 'Dados inválidos',
        type: 'validation_error',
        errors: err.errors || [{ message: err.message }],
        ...(isDevelopment && { stack: err.stack })
      }
    };
  }
  
  // Erro de autenticação
  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return {
      statusCode: 401,
      body: {
        success: false,
        message: 'Não autorizado',
        type: 'auth_error',
        code: 'UNAUTHORIZED'
      }
    };
  }
  
  // Erro de permissão
  if (err.statusCode === 403) {
    return {
      statusCode: 403,
      body: {
        success: false,
        message: 'Acesso negado',
        type: 'permission_error',
        code: 'FORBIDDEN'
      }
    };
  }
  
  // Erro de recurso não encontrado
  if (err.statusCode === 404) {
    return {
      statusCode: 404,
      body: {
        success: false,
        message: 'Recurso não encontrado',
        type: 'not_found_error',
        code: 'NOT_FOUND'
      }
    };
  }
  
  // Erro de rate limiting
  if (err.statusCode === 429) {
    return {
      statusCode: 429,
      body: {
        success: false,
        message: 'Muitas tentativas. Tente novamente mais tarde.',
        type: 'rate_limit_error',
        code: 'TOO_MANY_REQUESTS',
        retryAfter: err.retryAfter || 900 // 15 minutos por padrão
      }
    };
  }
  
  // Erro de payload muito grande
  if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FIELD_VALUE') {
    return {
      statusCode: 413,
      body: {
        success: false,
        message: 'Arquivo ou dados muito grandes',
        type: 'payload_error',
        code: 'PAYLOAD_TOO_LARGE'
      }
    };
  }
  
  // Erro de timeout
  if (err.code === 'TIMEOUT' || err.code === 'ETIMEDOUT') {
    return {
      statusCode: 408,
      body: {
        success: false,
        message: 'Tempo limite excedido',
        type: 'timeout_error',
        code: 'REQUEST_TIMEOUT'
      }
    };
  }
  
  // Erro de banco de dados
  if (err.code === 'ECONNREFUSED' || err.code === '23505' || err.name === 'DatabaseError') {
    return {
      statusCode: 500,
      body: {
        success: false,
        message: isProduction ? 'Erro interno do servidor' : 'Erro de banco de dados',
        type: 'database_error',
        code: 'DATABASE_ERROR',
        ...(isDevelopment && { 
          details: err.message, 
          sqlState: err.code 
        })
      }
    };
  }
  
  // Erro de integração externa (Mercado Pago, Omie, etc.)
  if (err.name === 'IntegrationError') {
    return {
      statusCode: 502,
      body: {
        success: false,
        message: 'Erro de integração externa',
        type: 'integration_error',
        code: 'EXTERNAL_SERVICE_ERROR',
        service: err.service || 'unknown',
        ...(isDevelopment && { details: err.message })
      }
    };
  }
  
  // Erro genérico do servidor
  const statusCode = err.statusCode || err.status || 500;
  
  return {
    statusCode,
    body: {
      success: false,
      message: isProduction ? 'Erro interno do servidor' : err.message,
      type: 'server_error',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.id || req.headers['x-request-id'],
      ...(isDevelopment && { 
        stack: err.stack,
        details: {
          name: err.name,
          code: err.code,
          url: req.originalUrl,
          method: req.method
        }
      })
    }
  };
};

/**
 * Sanitizar dados sensíveis do body para logs
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = [
    'password', 'senha', 'token', 'cpf', 'credit_card', 'card_number', 
    'cvv', 'access_token', 'refresh_token', 'authorization'
  ];
  
  const sanitized = { ...body };
  
  const sanitizeRecursive = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
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

/**
 * Handler para erros assíncronos não capturados
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para capturar erros 404
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Handler para erros de processo não capturados
 */
const setupProcessErrorHandlers = () => {
  // Capturar exceções não tratadas
  process.on('uncaughtException', (err) => {
    logger.error('Exceção não capturada:', {
      message: err.message,
      stack: err.stack,
      type: 'uncaughtException'
    });
    
    // Dar tempo para logs serem escritos antes de finalizar
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Capturar promises rejeitadas não tratadas
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promise rejeitada não tratada:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
      type: 'unhandledRejection'
    });
    
    // Em desenvolvimento, finalizar processo
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
  
  // Capturar avisos
  process.on('warning', (warning) => {
    logger.warn('Aviso do processo:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
      type: 'process_warning'
    });
  });
};

/**
 * Middleware para adicionar ID único à requisição
 */
const addRequestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Middleware para timeout de requisições
 */
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const error = new Error('Tempo limite da requisição excedido');
        error.statusCode = 408;
        error.code = 'TIMEOUT';
        next(error);
      }
    }, timeout);
    
    // Limpar timer quando resposta for enviada
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    next();
  };
};

/**
 * Classes de erro customizadas
 */
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

class AuthError extends Error {
  constructor(message = 'Não autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Recurso não encontrado') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class IntegrationError extends Error {
  constructor(message, service) {
    super(message);
    this.name = 'IntegrationError';
    this.statusCode = 502;
    this.service = service;
  }
}

class DatabaseError extends Error {
  constructor(message, query) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.query = query;
  }
}

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
  addRequestId,
  requestTimeout,
  // Classes de erro
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  IntegrationError,
  DatabaseError
};