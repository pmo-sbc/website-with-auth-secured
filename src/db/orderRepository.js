/**
 * Order Repository
 * Data access layer for order/transaction operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class OrderRepository {
  /**
   * Create a new order
   */
  create(userId, orderData) {
    const db = getDatabase();
    
    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const query = `
      INSERT INTO orders (
        user_id, order_number, customer_first_name, customer_last_name,
        customer_email, customer_phone, customer_address, customer_city,
        customer_state, customer_zip_code, customer_country,
        items, subtotal, discount, total, payment_method, discount_code_id, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      logger.db('INSERT', 'orders', { userId, orderNumber });
      
      const result = db.prepare(query).run(
        userId,
        orderNumber,
        orderData.customer.firstName || null,
        orderData.customer.lastName || null,
        orderData.customer.email,
        orderData.customer.phone || null,
        orderData.customer.address || null,
        orderData.customer.city || null,
        orderData.customer.state || null,
        orderData.customer.zipCode || null,
        orderData.customer.country || null,
        JSON.stringify(orderData.order.items),
        orderData.order.subtotal,
        orderData.order.discount || 0,
        orderData.order.total,
        orderData.payment ? orderData.payment.method || null : null,
        orderData.discountCodeId || null,
        'completed'
      );

      return {
        id: result.lastInsertRowid,
        orderNumber,
        userId
      };
    } catch (error) {
      logger.error('Error creating order', error);
      throw error;
    }
  }

  /**
   * Get all orders for a user
   */
  findByUserId(userId, limit = 50, offset = 0) {
    const db = getDatabase();
    const query = `
      SELECT 
        id, order_number, customer_first_name, customer_last_name,
        customer_email, customer_phone, customer_address, customer_city,
        customer_state, customer_zip_code, customer_country,
        items, subtotal, discount, total, payment_method, status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      logger.db('SELECT', 'orders', { userId, limit, offset });
      const orders = db.prepare(query).all(userId, limit, offset);
      
      // Parse JSON items for each order
      return orders.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      }));
    } catch (error) {
      logger.error('Error finding orders by user ID', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  findById(orderId, userId = null) {
    const db = getDatabase();
    let query = `
      SELECT 
        id, user_id, order_number, customer_first_name, customer_last_name,
        customer_email, customer_phone, customer_address, customer_city,
        customer_state, customer_zip_code, customer_country,
        items, subtotal, discount, total, payment_method, status, created_at
      FROM orders
      WHERE id = ?
    `;
    
    const params = [orderId];
    
    // If userId provided, ensure user owns the order
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    try {
      logger.db('SELECT', 'orders', { orderId, userId });
      const order = db.prepare(query).get(...params);
      
      if (!order) {
        return null;
      }
      
      return {
        ...order,
        items: JSON.parse(order.items)
      };
    } catch (error) {
      logger.error('Error finding order by ID', error);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  findByOrderNumber(orderNumber, userId = null) {
    const db = getDatabase();
    let query = `
      SELECT 
        id, user_id, order_number, customer_first_name, customer_last_name,
        customer_email, customer_phone, customer_address, customer_city,
        customer_state, customer_zip_code, customer_country,
        items, subtotal, discount, total, payment_method, status, created_at
      FROM orders
      WHERE order_number = ?
    `;
    
    const params = [orderNumber];
    
    // If userId provided, ensure user owns the order
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    try {
      logger.db('SELECT', 'orders', { orderNumber, userId });
      const order = db.prepare(query).get(...params);
      
      if (!order) {
        return null;
      }
      
      return {
        ...order,
        items: JSON.parse(order.items)
      };
    } catch (error) {
      logger.error('Error finding order by order number', error);
      throw error;
    }
  }

  /**
   * Get total count of orders for a user
   */
  countByUserId(userId) {
    const db = getDatabase();
    const query = 'SELECT COUNT(*) as count FROM orders WHERE user_id = ?';

    try {
      logger.db('SELECT', 'orders', { userId, action: 'count' });
      const result = db.prepare(query).get(userId);
      return result.count;
    } catch (error) {
      logger.error('Error counting orders by user ID', error);
      throw error;
    }
  }
}

module.exports = new OrderRepository();

