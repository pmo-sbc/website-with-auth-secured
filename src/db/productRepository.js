/**
 * Product Repository
 * Data access layer for product operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class ProductRepository {
  /**
   * Get all products
   */
  findAll(includeInactive = false) {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM products ORDER BY created_at DESC'
      : 'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'products', { includeInactive });
      return db.prepare(query).all();
    } catch (error) {
      logger.error('Error finding products', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  findById(id) {
    const db = getDatabase();
    const query = 'SELECT * FROM products WHERE id = ?';

    try {
      logger.db('SELECT', 'products', { id });
      return db.prepare(query).get(id);
    } catch (error) {
      logger.error('Error finding product by ID', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  create(name, price, description = null, is_active = true, provides_tokens = false, token_quantity = 0, is_course = false, course_date = null, course_zoom_link = null) {
    const db = getDatabase();
    const query = `
      INSERT INTO products (name, price, description, is_active, provides_tokens, token_quantity, is_course, course_date, course_zoom_link, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    try {
      logger.db('INSERT', 'products', { name, price, provides_tokens, token_quantity, is_course });
      const result = db.prepare(query).run(
        name, 
        price, 
        description, 
        is_active ? 1 : 0, 
        provides_tokens ? 1 : 0, 
        token_quantity || 0,
        is_course ? 1 : 0,
        course_date || null,
        course_zoom_link || null
      );
      return {
        id: result.lastInsertRowid,
        name,
        price,
        description,
        is_active: is_active ? 1 : 0,
        provides_tokens: provides_tokens ? 1 : 0,
        token_quantity: token_quantity || 0,
        is_course: is_course ? 1 : 0,
        course_date: course_date || null,
        course_zoom_link: course_zoom_link || null
      };
    } catch (error) {
      logger.error('Error creating product', error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  update(id, { name, price, description, is_active, provides_tokens, token_quantity, is_course, course_date, course_zoom_link }) {
    const db = getDatabase();
    const query = `
      UPDATE products
      SET name = ?, price = ?, description = ?, is_active = ?, provides_tokens = ?, token_quantity = ?, is_course = ?, course_date = ?, course_zoom_link = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    try {
      logger.db('UPDATE', 'products', { id, name, price, provides_tokens, token_quantity, is_course });
      const result = db.prepare(query).run(
        name, 
        price, 
        description, 
        is_active ? 1 : 0, 
        provides_tokens ? 1 : 0, 
        token_quantity || 0,
        is_course ? 1 : 0,
        course_date || null,
        course_zoom_link || null,
        id
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating product', error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  delete(id) {
    const db = getDatabase();
    const query = 'DELETE FROM products WHERE id = ?';

    try {
      logger.db('DELETE', 'products', { id });
      const result = db.prepare(query).run(id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting product', error);
      throw error;
    }
  }

  /**
   * Get purchase count for a product
   */
  getPurchaseCount(productId) {
    const db = getDatabase();
    
    try {
      logger.db('SELECT', 'products', { productId, action: 'purchase_count' });
      
      // Get product name for matching
      const product = db.prepare('SELECT name FROM products WHERE id = ?').get(productId);
      if (!product) {
        return 0;
      }
      
      // Get all completed orders
      const allOrders = db.prepare('SELECT items FROM orders WHERE status = ?').all('completed');
      let count = 0;
      
      allOrders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach(item => {
            // Match by product ID or product name
            if (item.id === productId || item.name === product.name) {
              count += (item.quantity || 1);
            }
          });
        } catch (e) {
          // Skip invalid JSON
          logger.warn('Error parsing order items JSON', { error: e.message });
        }
      });
      
      return count;
    } catch (error) {
      logger.error('Error getting purchase count', error);
      return 0;
    }
  }
}

module.exports = new ProductRepository();

