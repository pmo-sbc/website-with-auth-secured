/**
 * Validation Middleware
 */

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to handle validation errors
 * Must be used after express-validator validation chains
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));

    logger.warn('Validation failed', {
      url: req.originalUrl,
      errors: errorMessages
    });

    // Return first error for simplicity (can be modified to return all errors)
    return res.status(400).json({
      error: errorMessages[0].message,
      errors: errorMessages
    });
  }

  next();
}

/**
 * Sanitize request body to prevent prototype pollution
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    // Remove dangerous properties
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;
  }
  next();
}

module.exports = {
  handleValidationErrors,
  sanitizeBody
};
