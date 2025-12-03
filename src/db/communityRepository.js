/**
 * Community Repository
 * Data access layer for community operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class CommunityRepository {
  /**
   * Find all communities for a company
   */
  findByCompanyId(companyId, userId) {
    const db = getDatabase();
    // Join with companies to ensure the company belongs to the user
    const query = `
      SELECT c.* FROM communities c
      INNER JOIN companies co ON c.company_id = co.id
      WHERE c.company_id = ? AND co.user_id = ?
      ORDER BY c.created_at DESC
    `;

    try {
      logger.db('SELECT', 'communities', { companyId, userId });
      const communities = db.prepare(query).all(companyId, userId);
      // Parse JSON fields
      return communities.map(community => {
        if (community.technologies) {
          try {
            community.technologies = typeof community.technologies === 'string' 
              ? JSON.parse(community.technologies) 
              : community.technologies;
          } catch (e) {
            community.technologies = [];
          }
        } else {
          community.technologies = [];
        }
        return community;
      });
    } catch (error) {
      logger.error('Error finding communities by company ID', error);
      throw error;
    }
  }

  /**
   * Find community by ID (with user verification)
   */
  findById(communityId, userId) {
    const db = getDatabase();
    // Join with companies to ensure the community's company belongs to the user
    const query = `
      SELECT c.* FROM communities c
      INNER JOIN companies co ON c.company_id = co.id
      WHERE c.id = ? AND co.user_id = ?
    `;

    try {
      logger.db('SELECT', 'communities', { communityId, userId });
      const community = db.prepare(query).get(communityId, userId);
      if (community) {
        // Parse JSON fields
        if (community.technologies) {
          try {
            community.technologies = typeof community.technologies === 'string' 
              ? JSON.parse(community.technologies) 
              : community.technologies;
          } catch (e) {
            community.technologies = [];
          }
        } else {
          community.technologies = [];
        }
      }
      return community;
    } catch (error) {
      logger.error('Error finding community by ID', error);
      throw error;
    }
  }

  /**
   * Verify company belongs to user
   */
  verifyCompanyOwnership(companyId, userId) {
    const db = getDatabase();
    const query = 'SELECT id FROM companies WHERE id = ? AND user_id = ?';

    try {
      const result = db.prepare(query).get(companyId, userId);
      return !!result;
    } catch (error) {
      logger.error('Error verifying company ownership', error);
      return false;
    }
  }

  /**
   * Create new community
   */
  create(companyId, name, ilec = false, clec = false, servingCompanyName = null, technologies = []) {
    const db = getDatabase();
    const query = `
      INSERT INTO communities (company_id, name, ilec, clec, serving_company_name, technologies) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const technologiesJson = JSON.stringify(technologies);
      logger.db('INSERT', 'communities', { companyId, name, ilec, clec, servingCompanyName });
      const result = db.prepare(query).run(
        companyId, 
        name, 
        ilec ? 1 : 0, 
        clec ? 1 : 0, 
        servingCompanyName || null,
        technologiesJson
      );
      return {
        id: result.lastInsertRowid,
        company_id: companyId,
        name,
        ilec: !!ilec,
        clec: !!clec,
        serving_company_name: servingCompanyName,
        technologies: technologies,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error creating community', error);
      throw error;
    }
  }

  /**
   * Update community
   */
  update(communityId, userId, name, ilec = false, clec = false, servingCompanyName = null, technologies = []) {
    const db = getDatabase();
    // Update only if community belongs to user (via company)
    const query = `
      UPDATE communities 
      SET name = ?, ilec = ?, clec = ?, serving_company_name = ?, technologies = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND company_id IN (
        SELECT id FROM companies WHERE user_id = ?
      )
    `;

    try {
      const technologiesJson = JSON.stringify(technologies);
      logger.db('UPDATE', 'communities', { communityId, userId, name, ilec, clec, servingCompanyName });
      const result = db.prepare(query).run(
        name, 
        ilec ? 1 : 0, 
        clec ? 1 : 0, 
        servingCompanyName || null,
        technologiesJson,
        communityId, 
        userId
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating community', error);
      throw error;
    }
  }

  /**
   * Delete community
   */
  delete(communityId, userId) {
    const db = getDatabase();
    // Delete only if community belongs to user (via company)
    const query = `
      DELETE FROM communities 
      WHERE id = ? AND company_id IN (
        SELECT id FROM companies WHERE user_id = ?
      )
    `;

    try {
      logger.db('DELETE', 'communities', { communityId, userId });
      const result = db.prepare(query).run(communityId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting community', error);
      throw error;
    }
  }
}

module.exports = new CommunityRepository();

