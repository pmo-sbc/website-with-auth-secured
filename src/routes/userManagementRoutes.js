/**
 * User Management Routes
 * Admin routes for managing users
 */

const express = require('express');
const userRepository = require('../db/userRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureCsrf, sendCsrfToken } = require('../middleware/security');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const path = require('path');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /admin/users
 * Serve user management page
 */
router.get('/admin/users', requireAdmin, csrfProtection, sendCsrfToken, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-users.html'));
});

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/api/admin/users', requireAdmin, asyncHandler(async (req, res) => {
  const { getDatabase } = require('../db');
  const db = getDatabase();

  try {
    logger.db('SELECT', 'users', { action: 'list_all_users' });
    const users = db.prepare(`
      SELECT id, username, email, email_verified, tokens, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({
      success: true,
      users
    });
  } catch (error) {
    logger.error('Error fetching users', error);
    throw error;
  }
}));

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
router.delete('/api/admin/users/:id', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  // Prevent user from deleting themselves
  if (userId === req.session.userId) {
    return res.status(400).json({
      error: 'Cannot delete your own account'
    });
  }

  const deleted = userRepository.delete(userId);

  if (!deleted) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  logger.info('User deleted', {
    deletedUserId: userId,
    deletedBy: req.session.userId
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

/**
 * PATCH /api/admin/users/:id/tokens
 * Add tokens to a user account
 */
router.patch('/api/admin/users/:id/tokens', requireAdmin, csrfProtection, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount } = req.body;

  // Validate amount
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      error: 'Invalid token amount. Must be a positive number.'
    });
  }

  // Add tokens to user
  const success = userRepository.addTokens(userId, amount);

  if (!success) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  // Get updated token balance
  const newBalance = userRepository.getTokens(userId);

  logger.info('Tokens added to user', {
    userId,
    amount,
    newBalance,
    addedBy: req.session.userId
  });

  res.json({
    success: true,
    message: `${amount} token${amount > 1 ? 's' : ''} added successfully`,
    newBalance
  });
}));

module.exports = router;
