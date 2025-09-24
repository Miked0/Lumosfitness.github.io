const { Pool } = require('pg');
const { createLogger } = require('../utils/logger');

const logger = createLogger('database');

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lumos_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // tempo limite para conexão inativa
  connectionTimeoutMillis: 2000, // tempo limite para nova conexão
  statement_timeout: 30000, // timeout para queries
  query_timeout: 30000
});

// Event handlers para o pool
pool.on('connect', (client) => {
  logger.debug('Nova conexão estabelecida com PostgreSQL');
});

pool.on('error', (err, client) => {
  logger.error('Erro inesperado no cliente PostgreSQL:', err);
});

// Função para testar conexão
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as timestamp, version() as version');
    client.release();
    
    logger.info('Conexão com PostgreSQL testada com sucesso', {
      timestamp: result.rows[0].timestamp,
      version: result.rows[0].version.split(' ')[0]
    });
    
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com PostgreSQL:', error);
    throw error;
  }
};

// Função para executar query com log e tratamento de erro
const query = async (text, params = []) => {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Query executada', {
      query: text.substring(0, 100) + '...',
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Erro na query', {
      query: text.substring(0, 100) + '...',
      error: error.message,
      duration: `${duration}ms`,
      params: params
    });
    
    throw error;
  }
};

// Função para transação
const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    logger.debug('Transação iniciada');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    logger.debug('Transação commitada');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transação revertida devido ao erro:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Função para obter estatísticas do pool
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

// Função para fechar todas as conexões
const closeConnection = async () => {
  try {
    await pool.end();
    logger.info('Pool de conexões PostgreSQL fechado');
  } catch (error) {
    logger.error('Erro ao fechar pool de conexões:', error);
    throw error;
  }
};

// Queries helper - facilita consultas comuns
const queries = {
  // Produtos
  findProductById: 'SELECT * FROM produtos WHERE id = $1 AND ativo = true',
  findProductsByCategory: 'SELECT * FROM produtos WHERE categoria = $1 AND ativo = true ORDER BY nome',
  searchProducts: `
    SELECT * FROM produtos 
    WHERE ativo = true 
    AND (nome ILIKE $1 OR descricao ILIKE $1 OR categoria ILIKE $1)
    ORDER BY 
      CASE WHEN nome ILIKE $1 THEN 1
           WHEN categoria ILIKE $1 THEN 2
           ELSE 3 END,
      nome
  `,
  updateProductStock: 'UPDATE produtos SET estoque = estoque + $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
  
  // Clientes
  findClientByEmail: 'SELECT * FROM clientes WHERE email = $1 AND ativo = true',
  createClient: `
    INSERT INTO clientes (nome, email, telefone, cpf, omie_id) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING *
  `,
  
  // Pedidos
  createOrder: `
    INSERT INTO pedidos (cliente_id, status, subtotal, frete, total, metodo_pagamento, dados_pagamento, endereco_entrega, dados_frete) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *
  `,
  findOrderById: 'SELECT * FROM pedidos WHERE id = $1',
  updateOrderStatus: 'UPDATE pedidos SET status = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
  
  // Carrinho
  findCartBySession: 'SELECT * FROM carrinhos WHERE session_id = $1',
  upsertCart: `
    INSERT INTO carrinhos (session_id, itens, total) 
    VALUES ($1, $2, $3)
    ON CONFLICT (session_id) 
    DO UPDATE SET itens = $2, total = $3, atualizado_em = CURRENT_TIMESTAMP
    RETURNING *
  `,
  
  // Estatísticas
  getDashboardStats: `
    SELECT 
      (SELECT COUNT(*) FROM produtos WHERE ativo = true) as total_produtos,
      (SELECT SUM(estoque) FROM produtos WHERE ativo = true) as total_estoque,
      (SELECT COUNT(*) FROM pedidos WHERE status = 'aprovado') as pedidos_aprovados,
      (SELECT SUM(total) FROM pedidos WHERE status IN ('aprovado', 'enviado', 'entregue')) as faturamento_total
  `
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closeConnection,
  getPoolStats,
  queries
};