const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { session: sessionCache } = require('../cache/redis');
const { createLogger } = require('../utils/logger');
const { validateBody } = require('../middleware/validation');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const logger = createLogger('auth');

// ============= MIDDLEWARE DE AUTENTICAÇÃO =============

/**
 * Middleware para verificar JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido',
        code: 'NO_TOKEN'
      });
    }

    // Verificar se token está na blacklist
    const isBlacklisted = await sessionCache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        logger.warn('Token JWT inválido', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }

      // Verificar se usuário ainda existe e está ativo
      try {
        const userResult = await query(
          'SELECT id, nome, email, ativo, tipo FROM usuarios WHERE id = $1 AND ativo = true',
          [decoded.userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Usuário não encontrado ou inativo',
            code: 'USER_NOT_FOUND'
          });
        }

        req.user = {
          id: decoded.userId,
          email: decoded.email,
          nome: userResult.rows[0].nome,
          tipo: userResult.rows[0].tipo,
          sessionId: decoded.sessionId
        };

        next();
      } catch (dbError) {
        logger.error('Erro ao verificar usuário na autenticação:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    });
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Middleware para verificar permissões de admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticação necessária'
    });
  }

  if (req.user.tipo !== 'admin') {
    logger.warn('Tentativa de acesso admin negada', {
      userId: req.user.id,
      email: req.user.email,
      tipo: req.user.tipo,
      ip: req.ip,
      url: req.originalUrl
    });

    return res.status(403).json({
      success: false,
      message: 'Acesso negado. Permissões de administrador necessárias.',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// ============= ROTAS DE AUTENTICAÇÃO =============

/**
 * POST /api/auth/login
 * Fazer login
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
  ],
  validateBody,
  async (req, res) => {
    try {
      const { email, password, lembrarMe = false } = req.body;

      // Buscar usuário
      const userResult = await query(
        `SELECT id, nome, email, senha, tipo, ativo, tentativas_login, 
                bloqueado_ate, ultimo_login 
         FROM usuarios WHERE email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        logger.warn('Tentativa de login com email inexistente', {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Email ou senha incorretos'
        });
      }

      const user = userResult.rows[0];

      // Verificar se conta está ativa
      if (!user.ativo) {
        return res.status(401).json({
          success: false,
          message: 'Conta desativada. Entre em contato com o suporte.',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // Verificar se conta está bloqueada
      if (user.bloqueado_ate && new Date(user.bloqueado_ate) > new Date()) {
        const tempoRestante = Math.ceil((new Date(user.bloqueado_ate) - new Date()) / 60000);
        return res.status(429).json({
          success: false,
          message: `Conta temporariamente bloqueada. Tente novamente em ${tempoRestante} minutos.`,
          code: 'ACCOUNT_LOCKED',
          retryAfter: tempoRestante * 60
        });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(password, user.senha);

      if (!senhaValida) {
        // Incrementar tentativas de login
        const tentativas = (user.tentativas_login || 0) + 1;
        let bloqueadoAte = null;

        // Bloquear conta após 5 tentativas
        if (tentativas >= 5) {
          bloqueadoAte = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        }

        await query(
          'UPDATE usuarios SET tentativas_login = $1, bloqueado_ate = $2 WHERE id = $3',
          [tentativas, bloqueadoAte, user.id]
        );

        logger.warn('Tentativa de login com senha incorreta', {
          userId: user.id,
          email,
          tentativas,
          bloqueado: !!bloqueadoAte,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Email ou senha incorretos',
          tentativasRestantes: Math.max(0, 5 - tentativas)
        });
      }

      // Login bem-sucedido - resetar tentativas
      await query(
        `UPDATE usuarios SET 
         tentativas_login = 0, 
         bloqueado_ate = NULL, 
         ultimo_login = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [user.id]
      );

      // Gerar tokens
      const sessionId = uuidv4();
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        tipo: user.tipo,
        sessionId
      };

      const accessTokenExpiration = lembrarMe ? '7d' : '24h';
      const refreshTokenExpiration = lembrarMe ? '30d' : '7d';

      const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: accessTokenExpiration
      });

      const refreshToken = jwt.sign(
        { ...tokenPayload, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: refreshTokenExpiration }
      );

      // Salvar sessão no Redis
      const sessionData = {
        userId: user.id,
        email: user.email,
        nome: user.nome,
        tipo: user.tipo,
        loginTime: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        lembrarMe
      };

      const sessionTTL = lembrarMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // segundos
      await sessionCache.save(sessionId, sessionData, sessionTTL);

      logger.info('Login realizado com sucesso', {
        userId: user.id,
        email: user.email,
        tipo: user.tipo,
        lembrarMe,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            tipo: user.tipo
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: accessTokenExpiration
          }
        }
      });

    } catch (error) {
      logger.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Renovar token de acesso
 */
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token é obrigatório')
  ],
  validateBody,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        async (err, decoded) => {
          if (err) {
            return res.status(403).json({
              success: false,
              message: 'Refresh token inválido',
              code: 'INVALID_REFRESH_TOKEN'
            });
          }

          if (decoded.type !== 'refresh') {
            return res.status(403).json({
              success: false,
              message: 'Token inválido',
              code: 'INVALID_TOKEN_TYPE'
            });
          }

          // Verificar se sessão ainda existe
          const sessionData = await sessionCache.get(decoded.sessionId);
          if (!sessionData) {
            return res.status(401).json({
              success: false,
              message: 'Sessão expirada. Faça login novamente.',
              code: 'SESSION_EXPIRED'
            });
          }

          // Gerar novo access token
          const newAccessToken = jwt.sign(
            {
              userId: decoded.userId,
              email: decoded.email,
              tipo: decoded.tipo,
              sessionId: decoded.sessionId
            },
            process.env.JWT_SECRET,
            { expiresIn: sessionData.lembrarMe ? '7d' : '24h' }
          );

          res.json({
            success: true,
            data: {
              accessToken: newAccessToken,
              expiresIn: sessionData.lembrarMe ? '7d' : '24h'
            }
          });
        }
      );
    } catch (error) {
      logger.error('Erro ao renovar token:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Fazer logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    
    // Adicionar token à blacklist
    await sessionCache.save(`blacklist:${token}`, true, 24 * 60 * 60); // 24 horas
    
    // Remover sessão
    await sessionCache.remove(req.user.sessionId);
    
    logger.info('Logout realizado', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/auth/me
 * Obter informações do usuário logado
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Buscar informações atualizadas do usuário
    const userResult = await query(
      `SELECT id, nome, email, tipo, ativo, criado_em, ultimo_login 
       FROM usuarios WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = userResult.rows[0];
    
    res.json({
      success: true,
      data: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        ativo: user.ativo,
        criadoEm: user.criado_em,
        ultimoLogin: user.ultimo_login
      }
    });
  } catch (error) {
    logger.error('Erro ao obter dados do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/auth/sessions
 * Listar sessões ativas do usuário
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    // Esta é uma implementação simplificada
    // Em produção, você poderia manter um registro de todas as sessões
    const currentSession = await sessionCache.get(req.user.sessionId);
    
    if (!currentSession) {
      return res.json({
        success: true,
        data: {
          sessions: [],
          current: null
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        sessions: [
          {
            id: req.user.sessionId,
            current: true,
            loginTime: currentSession.loginTime,
            ip: currentSession.ip,
            userAgent: currentSession.userAgent,
            lembrarMe: currentSession.lembrarMe
          }
        ],
        current: req.user.sessionId
      }
    });
  } catch (error) {
    logger.error('Erro ao listar sessões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = {
  router,
  authenticateToken,
  requireAdmin
};