/**
 * Discount Code Repository
 * Data access layer for discount code operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class DiscountCodeRepository {
  /**
   * Get all discount codes
   */
  findAll(includeInactive = false) {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM discount_codes ORDER BY created_at DESC'
      : 'SELECT * FROM discount_codes WHERE is_active = 1 ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'discount_codes', { includeInactive });
      return db.prepare(query).all();
    } catch (error) {
      logger.error('Error finding discount codes', error);
      throw error;
    }
  }

  /**
   * Get discount code by code string
   */
  findByCode(code) {
    const db = getDatabase();
    const query = 'SELECT * FROM discount_codes WHERE code = ? AND is_active = 1';

    try {
      logger.db('SELECT', 'discount_codes', { code });
      return db.prepare(query).get(code.toUpperCase());
    } catch (error) {
      logger.error('Error finding discount code by code', error);
      throw error;
    }
  }

  /**
   * Get discount code by ID
   */
  findById(id) {
    const db = getDatabase();
    const query = 'SELECT * FROM discount_codes WHERE id = ?';

    try {
      logger.db('SELECT', 'discount_codes', { id });
      return db.prepare(query).get(id);
    } catch (error) {
      logger.error('Error finding discount code by ID', error);
      throw error;
    }
  }

  /**
   * Create a new discount code
   */
  create(code, discountPercentage) {
    const db = getDatabase();
    const query = `
      INSERT INTO discount_codes (code, discount_percentage, is_active, usage_count, created_at, updated_at)
      VALUES (?, ?, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    try {
      logger.db('INSERT', 'discount_codes', { code, discountPercentage });
      const result = db.prepare(query).run(code.toUpperCase(), discountPercentage);
      return {
        id: result.lastInsertRowid,
        code: code.toUpperCase(),
        discount_percentage: discountPercentage,
        is_active: 1,
        usage_count: 0
      };
    } catch (error) {
      logger.error('Error creating discount code', error);
      throw error;
    }
  }

  /**
   * Update a discount code
   */
  update(id, { code, discountPercentage, is_active }) {
    const db = getDatabase();
    const query = `
      UPDATE discount_codes
      SET code = ?, discount_percentage = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      logger.db('UPDATE', 'discount_codes', { id, code, discountPercentage });
      const result = db.prepare(query).run(
        code ? code.toUpperCase() : undefined,
        discountPercentage,
        is_active ? 1 : 0,
        id
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating discount code', error);
      throw error;
    }
  }

  /**
   * Delete a discount code
   */
  delete(id) {
    const db = getDatabase();
    const query = 'DELETE FROM discount_codes WHERE id = ?';

    try {
      logger.db('DELETE', 'discount_codes', { id });
      const result = db.prepare(query).run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting discount code', error);
      throw error;
    }
  }

  /**
   * Increment usage count for a discount code
   */
  incrementUsage(codeId) {
    const db = getDatabase();
    const query = 'UPDATE discount_codes SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

    try {
      logger.db('UPDATE', 'discount_codes', { codeId, action: 'increment_usage' });
      const result = db.prepare(query).run(codeId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error incrementing discount code usage', error);
      throw error;
    }
  }
}

module.exports = new DiscountCodeRepository();

