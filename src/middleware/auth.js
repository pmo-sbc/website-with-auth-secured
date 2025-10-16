/**
 * Authentication Middleware
 */

const logger = require('../utils/logger');
const userRepository = require('../db/userRepository');

/**
 * Middleware to require authentication
 * Checks if user is logged in via session
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    logger.debug(`Authenticated request from user ${req.session.userId}`);
    return next();
  }

  logger.warn(`Unauthorized access attempt to ${req.originalUrl}`);
  return res.status(401).json({
    error: 'Authentication required',
    message: 'You must be logged in to access this resource'
  });
}

/**
 * Middleware to check if user is already authenticated
 * Redirects to dashboard if logged in
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Middleware to attach user info to request
 */
function attachUser(req, res, next) {
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username
    };
  }
  next();
}

/**
 * Middleware to authenticate using Bearer token or session
 * Compatible with both JWT and session-based auth
 */
function authenticateToken(req, res, next) {
  // Check session first
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    req.username = req.session.username;
    return next();
  }

  // Check Authorization header for Bearer token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  // For now, just validate that token exists in localStorage
  // In a real app, you'd verify the JWT token here
  // Since we're using session-based auth, we'll accept any token
  // and rely on session validation in the API calls

  logger.warn('Bearer token provided but session-based auth is primary');
  return res.status(401).json({
    error: 'Invalid authentication method',
    message: 'Please use session-based authentication'
  });
}

/**
 * Middleware to require admin privileges
 * Checks if user is logged in and has admin role
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    logger.warn(`Unauthorized access attempt to admin resource: ${req.originalUrl}`);
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  try {
    const { getDatabase } = require('../db');
    const db = getDatabase();
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);

    if (!user || !user.is_admin) {
      logger.warn(`Non-admin user ${req.session.userId} attempted to access admin resource: ${req.originalUrl}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }

    logger.debug(`Admin access granted to user ${req.session.userId}`);
    next();
  } catch (error) {
    logger.error('Error checking admin status', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated,
  attachUser,
  authenticateToken,
  requireAdmin
};
