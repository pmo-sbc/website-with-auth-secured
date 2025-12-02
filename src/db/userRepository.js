/**
 * User Repository
 * Data access layer for user operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class UserRepository {
  /**
   * Find user by username or email
   */
  findByUsernameOrEmail(username, email = null) {
    const db = getDatabase();
    const query = email
      ? 'SELECT * FROM users WHERE username = ? OR email = ?'
      : 'SELECT * FROM users WHERE username = ? OR email = ?';

    try {
      logger.db('SELECT', 'users', { username, email });
      return db.prepare(query).get(username, email || username);
    } catch (error) {
      logger.error('Error finding user', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  findById(userId) {
    const db = getDatabase();
    const query = 'SELECT id, username, email, email_verified, is_admin, tokens, created_at FROM users WHERE id = ?';

    try {
      logger.db('SELECT', 'users', { userId });
      return db.prepare(query).get(userId);
    } catch (error) {
      logger.error('Error finding user by ID', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  create(username, email, hashedPassword) {
    const db = getDatabase();
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

    try {
      logger.db('INSERT', 'users', { username, email });
      const result = db.prepare(query).run(username, email, hashedPassword);
      return {
        id: result.lastInsertRowid,
        username,
        email
      };
    } catch (error) {
      logger.error('Error creating user', error);
      throw error;
    }
  }

  /**
   * Check if username exists
   */
  usernameExists(username) {
    const db = getDatabase();
    const query = 'SELECT id FROM users WHERE username = ?';

    try {
      const result = db.prepare(query).get(username);
      return !!result;
    } catch (error) {
      logger.error('Error checking username existence', error);
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  emailExists(email) {
    const db = getDatabase();
    const query = 'SELECT id FROM users WHERE email = ?';

    try {
      const result = db.prepare(query).get(email);
      return !!result;
    } catch (error) {
      logger.error('Error checking email existence', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  updatePassword(userId, hashedPassword) {
    const db = getDatabase();
    const query = 'UPDATE users SET password = ? WHERE id = ?';

    try {
      logger.db('UPDATE', 'users', { userId });
      const result = db.prepare(query).run(hashedPassword, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating password', error);
      throw error;
    }
  }

  /**
   * Update user email
   */
  updateEmail(userId, email) {
    const db = getDatabase();
    const query = 'UPDATE users SET email = ?, email_verified = 0 WHERE id = ?';

    try {
      logger.db('UPDATE', 'users', { userId, email, action: 'update_email' });
      const result = db.prepare(query).run(email, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating email', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  delete(userId) {
    const db = getDatabase();
    const query = 'DELETE FROM users WHERE id = ?';

    try {
      logger.db('DELETE', 'users', { userId });
      const result = db.prepare(query).run(userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting user', error);
      throw error;
    }
  }

  /**
   * Set email verification token
   */
  setVerificationToken(userId, token, expiresAt) {
    const db = getDatabase();
    const query = 'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?';

    try {
      logger.db('UPDATE', 'users', { userId, action: 'set_verification_token' });
      const result = db.prepare(query).run(token, expiresAt, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error setting verification token', error);
      throw error;
    }
  }

  /**
   * Find user by verification token
   */
  findByVerificationToken(token) {
    const db = getDatabase();
    const query = `
      SELECT * FROM users
      WHERE verification_token = ?
      AND verification_token_expires > datetime('now')
    `;

    try {
      logger.db('SELECT', 'users', { action: 'find_by_verification_token' });
      return db.prepare(query).get(token);
    } catch (error) {
      logger.error('Error finding user by verification token', error);
      throw error;
    }
  }

  /**
   * Verify user email
   */
  verifyEmail(userId) {
    const db = getDatabase();
    const query = `
      UPDATE users
      SET email_verified = 1,
          verification_token = NULL,
          verification_token_expires = NULL
      WHERE id = ?
    `;

    try {
      logger.db('UPDATE', 'users', { userId, action: 'verify_email' });
      const result = db.prepare(query).run(userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error verifying email', error);
      throw error;
    }
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(userId) {
    const db = getDatabase();
    const query = 'SELECT email_verified FROM users WHERE id = ?';

    try {
      const result = db.prepare(query).get(userId);
      return result ? !!result.email_verified : false;
    } catch (error) {
      logger.error('Error checking email verification', error);
      throw error;
    }
  }

  /**
   * Get user's token balance
   */
  getTokens(userId) {
    const db = getDatabase();
    const query = 'SELECT tokens FROM users WHERE id = ?';

    try {
      const result = db.prepare(query).get(userId);
      return result ? result.tokens : 0;
    } catch (error) {
      logger.error('Error getting user tokens', error);
      throw error;
    }
  }

  /**
   * Deduct tokens from user
   */
  deductTokens(userId, amount) {
    const db = getDatabase();
    const query = 'UPDATE users SET tokens = tokens - ? WHERE id = ? AND tokens >= ?';

    try {
      logger.db('UPDATE', 'users', { userId, amount, action: 'deduct_tokens' });
      const result = db.prepare(query).run(amount, userId, amount);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deducting tokens', error);
      throw error;
    }
  }

  /**
   * Add tokens to user
   */
  addTokens(userId, amount) {
    const db = getDatabase();
    const query = 'UPDATE users SET tokens = tokens + ? WHERE id = ?';

    try {
      logger.db('UPDATE', 'users', { userId, amount, action: 'add_tokens' });
      const result = db.prepare(query).run(amount, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error adding tokens', error);
      throw error;
    }
  }

  /**
   * Set password reset token
   */
  setPasswordResetToken(userId, token, expiresAt) {
    const db = getDatabase();
    const query = 'UPDATE users SET password_reset_token = ?, password_reset_token_expires = ? WHERE id = ?';

    try {
      logger.db('UPDATE', 'users', { userId, action: 'set_password_reset_token' });
      const result = db.prepare(query).run(token, expiresAt, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error setting password reset token', error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  findByPasswordResetToken(token) {
    const db = getDatabase();
    const query = `
      SELECT * FROM users
      WHERE password_reset_token = ?
      AND password_reset_token_expires > datetime('now')
    `;

    try {
      logger.db('SELECT', 'users', { action: 'find_by_password_reset_token' });
      return db.prepare(query).get(token);
    } catch (error) {
      logger.error('Error finding user by password reset token', error);
      throw error;
    }
  }

  /**
   * Clear password reset token
   */
  clearPasswordResetToken(userId) {
    const db = getDatabase();
    const query = `
      UPDATE users
      SET password_reset_token = NULL,
          password_reset_token_expires = NULL
      WHERE id = ?
    `;

    try {
      logger.db('UPDATE', 'users', { userId, action: 'clear_password_reset_token' });
      const result = db.prepare(query).run(userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error clearing password reset token', error);
      throw error;
    }
  }

  /**
   * Find user by email (for password reset)
   */
  findByEmail(email) {
    const db = getDatabase();
    const query = 'SELECT * FROM users WHERE email = ?';

    try {
      logger.db('SELECT', 'users', { email, action: 'find_by_email' });
      return db.prepare(query).get(email);
    } catch (error) {
      logger.error('Error finding user by email', error);
      throw error;
    }
  }

  /**
   * Update customer information
   */
  updateCustomerInfo(userId, customerData) {
    const db = getDatabase();
    const query = `
      UPDATE users 
      SET first_name = ?,
          last_name = ?,
          phone = ?,
          address = ?,
          city = ?,
          state = ?,
          zip_code = ?,
          country = ?
      WHERE id = ?
    `;

    try {
      logger.db('UPDATE', 'users', { userId, action: 'update_customer_info' });
      const result = db.prepare(query).run(
        customerData.firstName || null,
        customerData.lastName || null,
        customerData.phone || null,
        customerData.address || null,
        customerData.city || null,
        customerData.state || null,
        customerData.zipCode || null,
        customerData.country || null,
        userId
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating customer info', error);
      throw error;
    }
  }

  /**
   * Get customer information
   */
  getCustomerInfo(userId) {
    const db = getDatabase();
    const query = `
      SELECT first_name, last_name, phone, address, city, state, zip_code, country, email
      FROM users 
      WHERE id = ?
    `;

    try {
      logger.db('SELECT', 'users', { userId, action: 'get_customer_info' });
      const result = db.prepare(query).get(userId);
      if (!result) return null;
      
      return {
        firstName: result.first_name || null,
        lastName: result.last_name || null,
        phone: result.phone || null,
        address: result.address || null,
        city: result.city || null,
        state: result.state || null,
        zipCode: result.zip_code || null,
        country: result.country || null,
        email: result.email || null
      };
    } catch (error) {
      logger.error('Error getting customer info', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();
