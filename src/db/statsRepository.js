/**
 * Statistics Repository
 * Data access layer for usage statistics operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class StatsRepository {
  /**
   * Track template usage
   */
  trackUsage(userId, templateName, category) {
    const db = getDatabase();
    const query = `
      INSERT INTO usage_stats (user_id, template_name, category)
      VALUES (?, ?, ?)
    `;

    try {
      logger.db('INSERT', 'usage_stats', { userId, templateName, category });
      const result = db.prepare(query).run(userId, templateName, category);
      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Error tracking usage', error);
      throw error;
    }
  }

  /**
   * Get total usage count for a user
   */
  getTotalUsage(userId) {
    const db = getDatabase();
    const query = 'SELECT COUNT(*) as count FROM usage_stats WHERE user_id = ?';

    try {
      const result = db.prepare(query).get(userId);
      return result.count;
    } catch (error) {
      logger.error('Error getting total usage', error);
      throw error;
    }
  }

  /**
   * Get usage statistics by category
   */
  getUsageByCategory(userId) {
    const db = getDatabase();
    const query = `
      SELECT category, COUNT(*) as count
      FROM usage_stats
      WHERE user_id = ?
      GROUP BY category
      ORDER BY count DESC
    `;

    try {
      logger.db('SELECT', 'usage_stats', { userId });
      return db.prepare(query).all(userId);
    } catch (error) {
      logger.error('Error getting category stats', error);
      throw error;
    }
  }

  /**
   * Get recent activity for a user
   */
  getRecentActivity(userId, limit = 10) {
    const db = getDatabase();
    const query = `
      SELECT template_name, category, used_at
      FROM usage_stats
      WHERE user_id = ?
      ORDER BY used_at DESC
      LIMIT ?
    `;

    try {
      logger.db('SELECT', 'usage_stats', { userId, limit });
      return db.prepare(query).all(userId, limit);
    } catch (error) {
      logger.error('Error getting recent activity', error);
      throw error;
    }
  }

  /**
   * Get most used templates for a user
   */
  getMostUsedTemplates(userId, limit = 5) {
    const db = getDatabase();
    const query = `
      SELECT template_name, category, COUNT(*) as count
      FROM usage_stats
      WHERE user_id = ?
      GROUP BY template_name, category
      ORDER BY count DESC
      LIMIT ?
    `;

    try {
      return db.prepare(query).all(userId, limit);
    } catch (error) {
      logger.error('Error getting most used templates', error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics for a user
   */
  getUserStats(userId) {
    try {
      const totalUsage = this.getTotalUsage(userId);
      const categoryStats = this.getUsageByCategory(userId);
      const recentActivity = this.getRecentActivity(userId);
      const mostUsedTemplates = this.getMostUsedTemplates(userId);

      return {
        totalUsage,
        categoryStats,
        recentActivity,
        mostUsedTemplates
      };
    } catch (error) {
      logger.error('Error getting user stats', error);
      throw error;
    }
  }

  /**
   * Delete all usage stats for a user
   */
  deleteByUserId(userId) {
    const db = getDatabase();
    const query = 'DELETE FROM usage_stats WHERE user_id = ?';

    try {
      logger.db('DELETE', 'usage_stats', { userId });
      const result = db.prepare(query).run(userId);
      return result.changes;
    } catch (error) {
      logger.error('Error deleting usage stats', error);
      throw error;
    }
  }
}

module.exports = new StatsRepository();
