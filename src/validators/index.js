/**
 * Validation Schemas
 * Centralized validation rules using express-validator
 */

const { body, param } = require('express-validator');
const config = require('../config');

const validators = {
  // User Registration Validation
  register: [
    body('username')
      .trim()
      .isLength({
        min: config.validation.username.minLength,
        max: config.validation.username.maxLength
      })
      .withMessage(`Username must be ${config.validation.username.minLength}-${config.validation.username.maxLength} characters`)
      .isAlphanumeric()
      .withMessage('Username must contain only letters and numbers')
      .escape(),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .isLength({ max: config.validation.email.maxLength })
      .withMessage('Email is too long'),

    body('password')
      .isLength({ min: config.validation.password.minLength })
      .withMessage(`Password must be at least ${config.validation.password.minLength} characters`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],

  // User Login Validation
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .escape(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Save Prompt Validation
  savePrompt: [
    body('templateName')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .escape(),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .escape(),

    body('promptText')
      .trim()
      .notEmpty()
      .withMessage('Prompt text is required')
      .isLength({ max: config.validation.promptText.maxLength })
      .withMessage('Prompt text is too long'),

    body('inputs')
      .optional()
      .isObject()
      .withMessage('Inputs must be an object')
  ],

  // Track Usage Validation
  trackUsage: [
    body('templateName')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .escape(),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .escape()
  ],

  // Delete Prompt Validation
  deletePrompt: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid prompt ID')
      .toInt()
  ],

  // Search Prompts Validation
  searchPrompts: [
    body('searchTerm')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be 1-100 characters')
      .escape()
  ]
};

module.exports = validators;
