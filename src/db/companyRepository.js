/**
 * Company Repository
 * Data access layer for company operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class CompanyRepository {
  /**
   * Find all companies for a user
   */
  findByUserId(userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'companies', { userId });
      return db.prepare(query).all(userId);
    } catch (error) {
      logger.error('Error finding companies by user ID', error);
      throw error;
    }
  }

  /**
   * Find company by ID
   */
  findById(companyId, userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM companies WHERE id = ? AND user_id = ?';

    try {
      logger.db('SELECT', 'companies', { companyId, userId });
      return db.prepare(query).get(companyId, userId);
    } catch (error) {
      logger.error('Error finding company by ID', error);
      throw error;
    }
  }

  /**
   * Create new company
   */
  create(userId, name, legalName = null, marketingName = null) {
    const db = getDatabase();
    const query = 'INSERT INTO companies (user_id, name, legal_name, marketing_name) VALUES (?, ?, ?, ?)';

    try {
      logger.db('INSERT', 'companies', { userId, name, legalName, marketingName });
      const result = db.prepare(query).run(userId, name, legalName || null, marketingName || null);
      return {
        id: result.lastInsertRowid,
        user_id: userId,
        name,
        legal_name: legalName || null,
        marketing_name: marketingName || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating company', error);
      throw error;
    }
  }

  /**
   * Update company
   */
  update(companyId, userId, name, legalName = null, marketingName = null) {
    const db = getDatabase();
    const query = 'UPDATE companies SET name = ?, legal_name = ?, marketing_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?';

    try {
      logger.db('UPDATE', 'companies', { companyId, userId, name, legalName, marketingName });
      const result = db.prepare(query).run(name, legalName || null, marketingName || null, companyId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating company', error);
      throw error;
    }
  }

  /**
   * Delete company
   */
  delete(companyId, userId) {
    const db = getDatabase();
    const query = 'DELETE FROM companies WHERE id = ? AND user_id = ?';

    try {
      logger.db('DELETE', 'companies', { companyId, userId });
      const result = db.prepare(query).run(companyId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting company', error);
      throw error;
    }
  }
}

module.exports = new CompanyRepository();

