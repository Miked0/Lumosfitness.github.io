const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { produtos: produtoCache } = require('../cache/redis');
const { createLogger } = require('../utils/logger');
const { validateQuery, validateParams } = require('../middleware/validation');
const { body, param, query: queryValidator } = require('express-validator');

const logger = createLogger('produtos');

// ============= ROTAS DE PRODUTOS =============

/**
 * GET /api/produtos
 * Lista todos os produtos com filtros opcionais
 */
router.get('/', 
  [
    queryValidator('categoria').optional().isString().trim(),
    queryValidator('busca').optional().isString().trim().isLength({ min: 2, max: 100 }),
    queryValidator('destaque').optional().isBoolean(),
    queryValidator('limite').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryValidator('pagina').optional().isInt({ min: 1 }).toInt(),
    queryValidator('ordenar').optional().isIn(['nome', 'preco', 'categoria', 'estoque']),
    queryValidator('direcao').optional().isIn(['asc', 'desc'])
  ],
  validateQuery,
  async (req, res) => {
    try {
      const {
        categoria,
        busca,
        destaque,
        limite = 50,
        pagina = 1,
        ordenar = 'nome',
        direcao = 'asc'
      } = req.query;

      const filters = { categoria, busca, destaque, limite, pagina, ordenar, direcao };
      
      // Tentar obter do cache primeiro
      const cachedResult = await produtoCache.getList(filters);
      if (cachedResult) {
        logger.debug('Produtos obtidos do cache');
        return res.json({
          success: true,
          data: cachedResult.data,
          pagination: cachedResult.pagination,
          cached: true
        });
      }

      // Construir query SQL
      let sqlQuery = 'SELECT * FROM produtos WHERE ativo = true';
      const params = [];
      let paramCount = 0;

      // Aplicar filtros
      if (categoria) {
        paramCount++;
        sqlQuery += ` AND categoria ILIKE $${paramCount}`;
        params.push(`%${categoria}%`);
      }

      if (busca) {
        paramCount++;
        sqlQuery += ` AND (nome ILIKE $${paramCount} OR descricao ILIKE $${paramCount} OR categoria ILIKE $${paramCount})`;
        params.push(`%${busca}%`);
      }

      if (destaque === 'true') {
        sqlQuery += ` AND destaque = true`;
      }

      // Ordenação
      const validColumns = ['nome', 'preco', 'categoria', 'estoque', 'criado_em'];
      const orderColumn = validColumns.includes(ordenar) ? ordenar : 'nome';
      const orderDirection = direcao === 'desc' ? 'DESC' : 'ASC';
      sqlQuery += ` ORDER BY ${orderColumn} ${orderDirection}`;

      // Paginação
      const offset = (pagina - 1) * limite;
      sqlQuery += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limite, offset);

      // Executar query
      const result = await query(sqlQuery, params);
      
      // Query para contar total de registros
      let countQuery = 'SELECT COUNT(*) as total FROM produtos WHERE ativo = true';
      const countParams = [];
      let countParamCount = 0;

      if (categoria) {
        countParamCount++;
        countQuery += ` AND categoria ILIKE $${countParamCount}`;
        countParams.push(`%${categoria}%`);
      }

      if (busca) {
        countParamCount++;
        countQuery += ` AND (nome ILIKE $${countParamCount} OR descricao ILIKE $${countParamCount} OR categoria ILIKE $${countParamCount})`;
        countParams.push(`%${busca}%`);
      }

      if (destaque === 'true') {
        countQuery += ` AND destaque = true`;
      }

      const countResult = await query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      const pagination = {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        totalPaginas: Math.ceil(total / limite),
        temProxima: pagina * limite < total,
        temAnterior: pagina > 1
      };

      const responseData = {
        data: result.rows,
        pagination
      };

      // Salvar no cache por 5 minutos
      await produtoCache.setList(filters, responseData, 300);

      logger.info(`Produtos listados: ${result.rows.length} de ${total}`, { filters });

      res.json({
        success: true,
        ...responseData,
        cached: false
      });

    } catch (error) {
      logger.error('Erro ao listar produtos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/produtos/:id
 * Obter detalhes de um produto específico
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('ID do produto deve ser um número inteiro positivo')
  ],
  validateParams,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Tentar obter do cache primeiro
      const cachedProduct = await produtoCache.getProduct(id);
      if (cachedProduct) {
        logger.debug(`Produto ${id} obtido do cache`);
        return res.json({
          success: true,
          data: cachedProduct,
          cached: true
        });
      }

      // Buscar no banco de dados
      const result = await query(
        'SELECT * FROM produtos WHERE id = $1 AND ativo = true',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      const produto = result.rows[0];
      
      // Salvar no cache por 10 minutos
      await produtoCache.setProduct(id, produto, 600);

      logger.info(`Produto obtido: ${produto.nome}`, { id: produto.id });

      res.json({
        success: true,
        data: produto,
        cached: false
      });

    } catch (error) {
      logger.error('Erro ao obter produto:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/produtos/categoria/:categoria
 * Listar produtos por categoria
 */
router.get('/categoria/:categoria',
  [
    param('categoria').isString().trim().isLength({ min: 2, max: 50 })
  ],
  validateParams,
  async (req, res) => {
    try {
      const { categoria } = req.params;
      const { limite = 20, pagina = 1 } = req.query;

      const filters = { categoria, limite: parseInt(limite), pagina: parseInt(pagina) };
      
      // Verificar cache
      const cachedResult = await produtoCache.getList(filters);
      if (cachedResult) {
        return res.json({
          success: true,
          data: cachedResult.data,
          pagination: cachedResult.pagination,
          cached: true
        });
      }

      const offset = (pagina - 1) * limite;
      
      // Buscar produtos da categoria
      const result = await query(
        `SELECT * FROM produtos 
         WHERE categoria ILIKE $1 AND ativo = true 
         ORDER BY nome ASC 
         LIMIT $2 OFFSET $3`,
        [`%${categoria}%`, limite, offset]
      );

      // Contar total
      const countResult = await query(
        'SELECT COUNT(*) as total FROM produtos WHERE categoria ILIKE $1 AND ativo = true',
        [`%${categoria}%`]
      );
      
      const total = parseInt(countResult.rows[0].total);
      
      const pagination = {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        totalPaginas: Math.ceil(total / limite)
      };

      const responseData = {
        data: result.rows,
        pagination
      };

      // Cache por 5 minutos
      await produtoCache.setList(filters, responseData, 300);

      res.json({
        success: true,
        ...responseData,
        cached: false
      });

    } catch (error) {
      logger.error('Erro ao listar produtos por categoria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * GET /api/produtos/buscar/:termo
 * Buscar produtos por termo
 */
router.get('/buscar/:termo',
  [
    param('termo').isString().trim().isLength({ min: 2, max: 100 })
  ],
  validateParams,
  async (req, res) => {
    try {
      const { termo } = req.params;
      const { limite = 20, pagina = 1 } = req.query;

      const offset = (pagina - 1) * limite;
      
      // Busca com relevância (nome tem maior peso)
      const result = await query(
        `SELECT *, 
                CASE 
                  WHEN nome ILIKE $1 THEN 3
                  WHEN categoria ILIKE $1 THEN 2
                  WHEN descricao ILIKE $1 THEN 1
                  ELSE 0
                END as relevancia
         FROM produtos 
         WHERE ativo = true 
         AND (nome ILIKE $1 OR descricao ILIKE $1 OR categoria ILIKE $1)
         ORDER BY relevancia DESC, nome ASC
         LIMIT $2 OFFSET $3`,
        [`%${termo}%`, limite, offset]
      );

      // Contar resultados
      const countResult = await query(
        `SELECT COUNT(*) as total FROM produtos 
         WHERE ativo = true 
         AND (nome ILIKE $1 OR descricao ILIKE $1 OR categoria ILIKE $1)`,
        [`%${termo}%`]
      );
      
      const total = parseInt(countResult.rows[0].total);
      
      logger.info(`Busca por "${termo}": ${result.rows.length} resultados encontrados`);

      res.json({
        success: true,
        data: result.rows,
        termo,
        pagination: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          totalPaginas: Math.ceil(total / limite)
        }
      });

    } catch (error) {
      logger.error('Erro na busca de produtos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * GET /api/produtos/destaque
 * Listar produtos em destaque
 */
router.get('/em-destaque', async (req, res) => {
  try {
    const { limite = 6 } = req.query;
    
    const filters = { destaque: true, limite: parseInt(limite) };
    
    // Verificar cache
    const cachedResult = await produtoCache.getList(filters);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult.data,
        cached: true
      });
    }

    const result = await query(
      `SELECT * FROM produtos 
       WHERE ativo = true AND destaque = true 
       ORDER BY criado_em DESC 
       LIMIT $1`,
      [limite]
    );

    const responseData = { data: result.rows };
    
    // Cache por 10 minutos
    await produtoCache.setList(filters, responseData, 600);

    res.json({
      success: true,
      data: result.rows,
      cached: false
    });

  } catch (error) {
    logger.error('Erro ao obter produtos em destaque:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/produtos/categorias
 * Listar todas as categorias disponíveis
 */
router.get('/meta/categorias', async (req, res) => {
  try {
    // Verificar cache
    const cachedCategories = await produtoCache.getList({ type: 'categories' });
    if (cachedCategories) {
      return res.json({
        success: true,
        data: cachedCategories.data,
        cached: true
      });
    }

    const result = await query(
      `SELECT categoria, COUNT(*) as total 
       FROM produtos 
       WHERE ativo = true 
       GROUP BY categoria 
       ORDER BY categoria`
    );

    const responseData = { data: result.rows };
    
    // Cache por 1 hora
    await produtoCache.setList({ type: 'categories' }, responseData, 3600);

    res.json({
      success: true,
      data: result.rows,
      cached: false
    });

  } catch (error) {
    logger.error('Erro ao obter categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/produtos/:id/relacionados
 * Obter produtos relacionados
 */
router.get('/:id/relacionados',
  [
    param('id').isInt({ min: 1 })
  ],
  validateParams,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { limite = 4 } = req.query;

      // Primeiro, obter o produto atual para conhecer sua categoria
      const produtoAtual = await query(
        'SELECT categoria FROM produtos WHERE id = $1 AND ativo = true',
        [id]
      );

      if (produtoAtual.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado'
        });
      }

      const categoria = produtoAtual.rows[0].categoria;

      // Buscar produtos relacionados (mesma categoria, exceto o atual)
      const result = await query(
        `SELECT * FROM produtos 
         WHERE categoria = $1 AND id != $2 AND ativo = true 
         ORDER BY RANDOM() 
         LIMIT $3`,
        [categoria, id, limite]
      );

      res.json({
        success: true,
        data: result.rows
      });

    } catch (error) {
      logger.error('Erro ao obter produtos relacionados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

module.exports = router;