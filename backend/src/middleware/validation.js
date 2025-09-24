const { validationResult, body, param, query } = require('express-validator');
const { createLogger } = require('../utils/logger');

const logger = createLogger('validation');

/**
 * Middleware para validar resultado das validações
 */
const handleValidationResult = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    logger.warn('Erro de validação', {
      url: req.originalUrl,
      method: req.method,
      errors: errorDetails,
      ip: req.ip
    });
    
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errorDetails
    });
  }
  
  next();
};

/**
 * Middleware específico para validação de parâmetros
 */
const validateParams = (req, res, next) => {
  return handleValidationResult(req, res, next);
};

/**
 * Middleware específico para validação de query parameters
 */
const validateQuery = (req, res, next) => {
  return handleValidationResult(req, res, next);
};

/**
 * Middleware específico para validação de body
 */
const validateBody = (req, res, next) => {
  return handleValidationResult(req, res, next);
};

/**
 * Validações comuns reutilizáveis
 */
const commonValidations = {
  // CPF brasileiro
  cpf: () => body('cpf')
    .isString()
    .trim()
    .matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
    .withMessage('CPF deve estar no formato 000.000.000-00')
    .custom((value) => {
      // Validação básica de CPF (algoritmo)
      const cpf = value.replace(/\D/g, '');
      
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        throw new Error('CPF inválido');
      }
      
      // Valida dígitos verificadores
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
      }
      let digit = 11 - (sum % 11);
      if (digit === 10 || digit === 11) digit = 0;
      if (digit !== parseInt(cpf.charAt(9))) {
        throw new Error('CPF inválido');
      }
      
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
      }
      digit = 11 - (sum % 11);
      if (digit === 10 || digit === 11) digit = 0;
      if (digit !== parseInt(cpf.charAt(10))) {
        throw new Error('CPF inválido');
      }
      
      return true;
    }),

  // CEP brasileiro
  cep: () => body('cep')
    .isString()
    .trim()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve estar no formato 00000-000'),

  // Telefone brasileiro
  telefone: () => body('telefone')
    .isString()
    .trim()
    .matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/)
    .withMessage('Telefone deve estar no formato (00) 00000-0000'),

  // Email
  email: (field = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),

  // Nome completo
  nomeCompleto: (field = 'nome') => body(field)
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[A-Za-zÀ-ſ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),

  // UUID v4
  uuid: (field) => param(field)
    .isUUID(4)
    .withMessage(`${field} deve ser um UUID válido`),

  // ID numérico
  id: (field) => param(field)
    .isInt({ min: 1 })
    .withMessage(`${field} deve ser um número inteiro positivo`),

  // Paginação
  pagination: () => [
    query('pagina')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro positivo')
      .toInt(),
    query('limite')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser entre 1 e 100')
      .toInt()
  ],

  // Preço
  preco: (field = 'preco') => body(field)
    .isFloat({ min: 0.01 })
    .withMessage('Preço deve ser um valor positivo'),

  // Quantidade
  quantidade: (field = 'quantidade') => body(field)
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantidade deve ser entre 1 e 10'),

  // Tamanho de roupa
  tamanho: (field = 'tamanho') => body(field)
    .isIn(['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG'])
    .withMessage('Tamanho inválido'),

  // Data (formato brasileiro)
  data: (field) => body(field)
    .isISO8601()
    .withMessage('Data deve estar no formato ISO 8601')
    .toDate(),

  // Status de pedido
  statusPedido: (field = 'status') => body(field)
    .isIn([
      'pendente', 'pendente_pagamento', 'aprovado', 'processando',
      'enviado', 'entregue', 'cancelado', 'rejeitado', 'reembolsado'
    ])
    .withMessage('Status de pedido inválido'),

  // Método de pagamento
  metodoPagamento: (field = 'metodoPagamento') => body(field)
    .isIn(['pix', 'cartao', 'boleto', 'dinheiro'])
    .withMessage('Método de pagamento inválido'),

  // Observações/comentários
  observacoes: (field = 'observacoes') => body(field)
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações não podem exceder 500 caracteres')
};

/**
 * Validações específicas para diferentes entidades
 */
const entityValidations = {
  // Produto
  produto: {
    criar: [
      body('nome').isString()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nome do produto deve ter entre 2 e 200 caracteres'),
      body('descricao').optional()
        .isString()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Descrição não pode exceder 1000 caracteres'),
      body('categoria').isString()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Categoria deve ter entre 2 e 50 caracteres'),
      commonValidations.preco(),
      body('preco_original').optional()
        .isFloat({ min: 0.01 })
        .withMessage('Preço original deve ser um valor positivo'),
      body('tamanhos').isArray({ min: 1 })
        .withMessage('Deve informar pelo menos um tamanho'),
      body('cores').isArray({ min: 1 })
        .withMessage('Deve informar pelo menos uma cor'),
      body('estoque').isInt({ min: 0 })
        .withMessage('Estoque deve ser um número inteiro positivo ou zero'),
      body('peso').optional()
        .isFloat({ min: 0.001 })
        .withMessage('Peso deve ser um valor positivo')
    ],
    
    atualizar: [
      commonValidations.id('id'),
      body('nome').optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 200 }),
      body('descricao').optional()
        .isString()
        .trim()
        .isLength({ max: 1000 }),
      body('categoria').optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 50 }),
      body('preco').optional()
        .isFloat({ min: 0.01 }),
      body('estoque').optional()
        .isInt({ min: 0 })
    ]
  },

  // Cliente
  cliente: {
    criar: [
      commonValidations.nomeCompleto(),
      commonValidations.email(),
      commonValidations.telefone(),
      commonValidations.cpf(),
      body('data_nascimento').optional()
        .isISO8601()
        .withMessage('Data de nascimento inválida')
        .toDate()
    ],
    
    atualizar: [
      commonValidations.id('id'),
      body('nome').optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 }),
      body('telefone').optional()
        .matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/)
    ]
  },

  // Endereço
  endereco: {
    criar: [
      commonValidations.cep(),
      body('endereco').isString()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Endereço deve ter entre 5 e 200 caracteres'),
      body('numero').isString()
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage('Número é obrigatório'),
      body('complemento').optional()
        .isString()
        .trim()
        .isLength({ max: 100 }),
      body('bairro').isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Bairro deve ter entre 2 e 100 caracteres'),
      body('cidade').isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Cidade deve ter entre 2 e 100 caracteres'),
      body('estado').isString()
        .trim()
        .isLength({ min: 2, max: 2 })
        .withMessage('Estado deve ter 2 caracteres (UF)')
    ]
  },

  // Pedido
  pedido: {
    criar: [
      body('cliente_id').isInt({ min: 1 })
        .withMessage('ID do cliente inválido'),
      body('itens').isArray({ min: 1 })
        .withMessage('Pedido deve ter pelo menos um item'),
      body('itens.*.produto_id').isInt({ min: 1 })
        .withMessage('ID do produto inválido'),
      body('itens.*.quantidade').isInt({ min: 1, max: 10 })
        .withMessage('Quantidade deve ser entre 1 e 10'),
      body('endereco_entrega').isObject()
        .withMessage('Endereço de entrega é obrigatório'),
      commonValidations.metodoPagamento('metodo_pagamento')
    ],
    
    atualizarStatus: [
      commonValidations.id('id'),
      commonValidations.statusPedido()
    ]
  }
};

/**
 * Sanitização de dados de entrada
 */
const sanitizeInput = (req, res, next) => {
  // Remover campos potencialmente perigosos
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    for (const key of dangerousFields) {
      delete obj[key];
    }
    
    for (const prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        obj[prop] = sanitizeObject(obj[prop]);
      }
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Middleware para limitar tamanho do payload
 */
const limitPayloadSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']);
    const maxSizeBytes = typeof maxSize === 'string' 
      ? parseInt(maxSize) * 1024 * 1024 
      : maxSize;
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        message: 'Payload muito grande',
        maxSize: maxSize
      });
    }
    
    next();
  };
};

/**
 * Validação customizada para arquivos de upload
 */
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }
    
    const errors = [];
    
    req.files.forEach((file, index) => {
      // Verificar tipo de arquivo
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        errors.push({
          file: index,
          field: 'mimetype',
          message: `Tipo de arquivo não permitido: ${file.mimetype}`,
          allowedTypes
        });
      }
      
      // Verificar tamanho
      if (file.size > maxSize) {
        errors.push({
          file: index,
          field: 'size',
          message: `Arquivo muito grande: ${file.size} bytes`,
          maxSize
        });
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Erro na validação de arquivos',
        errors
      });
    }
    
    next();
  };
};

module.exports = {
  validateParams,
  validateQuery,
  validateBody,
  handleValidationResult,
  commonValidations,
  entityValidations,
  sanitizeInput,
  limitPayloadSize,
  validateFileUpload
};