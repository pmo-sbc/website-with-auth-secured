/**
 * Security Middleware
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Configure Helmet security headers
 */
function configureHelmet() {
  return helmet(config.security.helmet);
}

/**
 * API Rate Limiter
 */
function configureApiRateLimit() {
  return rateLimit({
    windowMs: config.security.rateLimit.api.windowMs,
    max: config.security.rateLimit.api.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.'
      });
    }
  });
}

/**
 * Authentication Rate Limiter (stricter)
 */
function configureAuthRateLimit() {
  return rateLimit({
    windowMs: config.security.rateLimit.auth.windowMs,
    max: config.security.rateLimit.auth.max,
    skipSuccessfulRequests: config.security.rateLimit.auth.skipSuccessfulRequests,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        error: 'Too many authentication attempts, please try again after 15 minutes.'
      });
    }
  });
}

/**
 * CSRF Protection
 */
function configureCsrf() {
  return csrf({ cookie: true });
}

/**
 * Send CSRF token to frontend
 */
function sendCsrfToken(req, res, next) {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false, // Must be readable by JavaScript
    secure: config.isProduction,
    sameSite: 'strict'
  });
  next();
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Additional custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

module.exports = {
  configureHelmet,
  configureApiRateLimit,
  configureAuthRateLimit,
  configureCsrf,
  sendCsrfToken,
  securityHeaders
};
