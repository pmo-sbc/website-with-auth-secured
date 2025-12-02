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
        items, subtotal, discount, total, payment_method, discount_code_id, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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

  /**
   * Delete an order by ID
   */
  delete(orderId) {
    const db = getDatabase();
    const query = 'DELETE FROM orders WHERE id = ?';

    try {
      logger.db('DELETE', 'orders', { orderId });
      const result = db.prepare(query).run(orderId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting order', error);
      throw error;
    }
  }

  /**
   * Get all users with their purchased products
   * Returns a list of users with their orders and products
   */
  getAllUsersWithPurchases() {
    const db = getDatabase();
    
    try {
      logger.db('SELECT', 'orders', { action: 'get_all_users_with_purchases' });
      
      // Get all orders with user information
      const query = `
        SELECT 
          o.id as order_id,
          o.order_number,
          o.created_at as order_date,
          o.items,
          u.id as user_id,
          u.username,
          u.email
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.status = 'completed'
        ORDER BY u.username, o.created_at DESC
      `;
      
      const orders = db.prepare(query).all();
      
      // Group orders by user
      const usersMap = new Map();
      
      orders.forEach(order => {
        const userId = order.user_id;
        
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            username: order.username,
            email: order.email,
            purchases: []
          });
        }
        
        const user = usersMap.get(userId);
        const items = JSON.parse(order.items);
        
        // Ensure order_date is properly formatted
        // SQLite returns dates as strings, ensure we have a valid date
        let orderDate = order.order_date;
        if (!orderDate || orderDate === null || orderDate === undefined || orderDate === '') {
          // If date is missing, log a warning but continue
          logger.warn('Order missing created_at date', { 
            orderId: order.order_id, 
            orderNumber: order.order_number,
            orderDateValue: order.order_date,
            orderDateType: typeof order.order_date
          });
          orderDate = null;
        } else {
          // Log successful date retrieval for debugging
          logger.db('SELECT', 'orders', { 
            orderId: order.order_id, 
            orderDate: orderDate,
            orderDateType: typeof orderDate
          });
        }
        
        // Add each item as a separate purchase entry
        items.forEach(item => {
          user.purchases.push({
            orderId: order.order_id,
            orderNumber: order.order_number,
            orderDate: orderDate,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity || 1,
            price: item.price || item.finalPrice || 0
          });
        });
      });
      
      // Convert map to array and sort by username
      return Array.from(usersMap.values()).sort((a, b) => 
        a.username.localeCompare(b.username)
      );
    } catch (error) {
      logger.error('Error getting all users with purchases', error);
      throw error;
    }
  }
}

module.exports = new OrderRepository();

