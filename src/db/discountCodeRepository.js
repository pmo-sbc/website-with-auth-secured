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
      const codes = db.prepare(query).all();
      // Parse product_ids JSON for each code
      return codes.map(code => ({
        ...code,
        product_ids: code.product_ids ? JSON.parse(code.product_ids) : null
      }));
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
      const result = db.prepare(query).get(code.toUpperCase());
      if (result) {
        return {
          ...result,
          product_ids: result.product_ids ? JSON.parse(result.product_ids) : null
        };
      }
      return result;
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
      const result = db.prepare(query).get(id);
      if (result) {
        // Parse product_ids - handle null, empty string, or JSON string
        // null or empty string = apply to all products
        // "[]" (empty array JSON) = apply to no products
        // "[1,2,3]" (non-empty array JSON) = apply to specific products
        let productIds = null;
        if (result.product_ids !== null && result.product_ids !== undefined) {
          const trimmed = String(result.product_ids).trim();
          if (trimmed && trimmed !== 'null') {
            try {
              productIds = JSON.parse(trimmed);
              // Ensure it's an array after parsing
              if (!Array.isArray(productIds)) {
                productIds = null; // Invalid format, default to null
              }
            } catch (e) {
              logger.warn('Failed to parse product_ids for discount code', { id, product_ids: result.product_ids, error: e.message });
              productIds = null;
            }
          } else if (trimmed === '') {
            // Empty string should be treated as null (apply to all)
            productIds = null;
          }
        }
        
        return {
          ...result,
          product_ids: productIds
        };
      }
      return result;
    } catch (error) {
      logger.error('Error finding discount code by ID', error);
      throw error;
    }
  }

  /**
   * Create a new discount code
   */
  create(code, discountPercentage, productIds = null) {
    const db = getDatabase();
    const query = `
      INSERT INTO discount_codes (code, discount_percentage, is_active, usage_count, product_ids, created_at, updated_at)
      VALUES (?, ?, 1, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    try {
      // Convert productIds to JSON string:
      // null/undefined = apply to all products (store as NULL)
      // [] (empty array) = apply to no products (store as "[]")
      // [1, 2, 3] (non-empty array) = apply to specific products (store as "[1,2,3]")
      let productIdsJson = null;
      if (productIds !== null && productIds !== undefined) {
        if (Array.isArray(productIds)) {
          productIdsJson = JSON.stringify(productIds); // This will be "[]" for empty arrays
        } else {
          productIdsJson = null; // Invalid type, default to null
        }
      }

      logger.db('INSERT', 'discount_codes', { code, discountPercentage, productIds });
      const result = db.prepare(query).run(code.toUpperCase(), discountPercentage, productIdsJson);
      
      const newCode = this.findById(result.lastInsertRowid);
      return {
        ...newCode,
        product_ids: productIdsJson ? JSON.parse(productIdsJson) : null
      };
    } catch (error) {
      logger.error('Error creating discount code', error);
      throw error;
    }
  }

  /**
   * Update a discount code
   */
  update(id, { code, discountPercentage, is_active, productIds }) {
    const db = getDatabase();
    const query = `
      UPDATE discount_codes
      SET code = ?, discount_percentage = ?, is_active = ?, product_ids = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      // Convert productIds to JSON string:
      // null/undefined = apply to all products (store as NULL)
      // [] (empty array) = apply to no products (store as "[]")
      // [1, 2, 3] (non-empty array) = apply to specific products (store as "[1,2,3]")
      let productIdsJson = undefined;
      if (productIds !== undefined) {
        if (productIds === null) {
          productIdsJson = null; // Apply to all
        } else if (Array.isArray(productIds)) {
          productIdsJson = JSON.stringify(productIds); // This will be "[]" for empty arrays or "[1,2,3]" for non-empty
        } else {
          productIdsJson = undefined; // Invalid type, don't update
        }
      }

      logger.db('UPDATE', 'discount_codes', { id, code, discountPercentage, productIds });
      
      const params = [
        code ? code.toUpperCase() : undefined,
        discountPercentage,
        is_active !== undefined ? (is_active ? 1 : 0) : undefined,
        productIdsJson,
        id
      ].filter(p => p !== undefined);
      
      // Build query dynamically based on what's being updated
      const updateFields = [];
      const updateParams = [];
      let paramIndex = 0;
      
      if (code !== undefined) {
        updateFields.push('code = ?');
        updateParams.push(code.toUpperCase());
      }
      if (discountPercentage !== undefined) {
        updateFields.push('discount_percentage = ?');
        updateParams.push(discountPercentage);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateParams.push(is_active ? 1 : 0);
      }
      if (productIds !== undefined) {
        updateFields.push('product_ids = ?');
        updateParams.push(productIdsJson);
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateParams.push(id);
      
      const dynamicQuery = `
        UPDATE discount_codes
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      const result = db.prepare(dynamicQuery).run(...updateParams);
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

