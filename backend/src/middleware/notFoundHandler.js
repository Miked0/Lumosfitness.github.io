const { createLogger } = require('../utils/logger');

const logger = createLogger('notFound');

/**
 * Middleware para tratar rotas não encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = {
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    suggestion: getSuggestion(req.originalUrl)
  };

  // Log da tentativa de acesso a rota inexistente
  logger.warn('Rota não encontrada', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });

  res.status(404).json(error);
};

/**
 * Função para sugerir rotas similares
 */
const getSuggestion = (requestedPath) => {
  const availableRoutes = [
    '/api/health',
    '/api/produtos',
    '/api/carrinho',
    '/api/checkout',
    '/api/frete',
    '/api/admin',
    '/api/clientes',
    '/api/pedidos',
    '/api/webhooks'
  ];

  // Calcular distância de Levenshtein para encontrar rota similar
  const similarities = availableRoutes.map(route => ({
    route,
    distance: levenshteinDistance(requestedPath.toLowerCase(), route.toLowerCase())
  }));

  // Ordenar por similaridade
  similarities.sort((a, b) => a.distance - b.distance);

  // Retornar sugestão se a distância for razoável
  const bestMatch = similarities[0];
  if (bestMatch && bestMatch.distance <= 5) {
    return `Você quis dizer: ${bestMatch.route}?`;
  }

  return 'Verifique a documentação da API em /api/health';
};

/**
 * Algoritmo de Levenshtein para calcular distância entre strings
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  // Inicializar matriz
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Calcular distâncias
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

module.exports = notFoundHandler;