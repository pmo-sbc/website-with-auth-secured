/**
 * Service Package Repository
 * Data access layer for service package operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class ServicePackageRepository {
  /**
   * Find all service packages for a user
   */
  findByUserId(userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM service_packages WHERE user_id = ? ORDER BY created_at DESC';

    try {
      logger.db('SELECT', 'service_packages', { userId });
      return db.prepare(query).all(userId);
    } catch (error) {
      logger.error('Error finding service packages by user ID', error);
      throw error;
    }
  }

  /**
   * Find service package by ID (must belong to user)
   */
  findById(servicePackageId, userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM service_packages WHERE id = ? AND user_id = ?';

    try {
      logger.db('SELECT', 'service_packages', { servicePackageId, userId });
      return db.prepare(query).get(servicePackageId, userId);
    } catch (error) {
      logger.error('Error finding service package by ID', error);
      throw error;
    }
  }

  /**
   * Check if a package with the same name and technology type already exists for the user
   */
  findByNameAndTechnology(userId, name, technologyType, excludeId = null) {
    const db = getDatabase();
    let query = `
      SELECT * FROM service_packages 
      WHERE user_id = ? AND name = ? AND (technology_type = ? OR (technology_type IS NULL AND ? IS NULL))
    `;
    
    const params = [userId, name.trim(), technologyType || null, technologyType || null];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    try {
      logger.db('SELECT', 'service_packages', { userId, name, technologyType, excludeId });
      return db.prepare(query).get(...params);
    } catch (error) {
      logger.error('Error checking for duplicate package', error);
      throw error;
    }
  }

  /**
   * Create a new service package
   */
  create(userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed) {
    const db = getDatabase();
    
    // Check for duplicate name with same technology type
    const existing = this.findByNameAndTechnology(userId, name, technologyType);
    if (existing) {
      const error = new Error(`A package named "${name}" with technology type "${technologyType || 'none'}" already exists`);
      error.code = 'DUPLICATE_PACKAGE';
      throw error;
    }

    const query = `
      INSERT INTO service_packages (user_id, name, technology_type, license_type, download_speed, upload_speed)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      logger.db('INSERT', 'service_packages', { userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed });
      const result = db.prepare(query).run(
        userId,
        name.trim(),
        technologyType && technologyType.trim() ? technologyType.trim() : null,
        licenseType && licenseType.trim() ? licenseType.trim() : null,
        downloadSpeed ? downloadSpeed.trim() : null,
        uploadSpeed ? uploadSpeed.trim() : null
      );

      return this.findById(result.lastInsertRowid, userId);
    } catch (error) {
      logger.error('Error creating service package', error);
      throw error;
    }
  }

  /**
   * Update a service package
   */
  update(servicePackageId, userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed) {
    const db = getDatabase();
    
    // Check for duplicate name with same technology type (excluding current package)
    const existing = this.findByNameAndTechnology(userId, name, technologyType, servicePackageId);
    if (existing) {
      const error = new Error(`A package named "${name}" with technology type "${technologyType || 'none'}" already exists`);
      error.code = 'DUPLICATE_PACKAGE';
      throw error;
    }

    const query = `
      UPDATE service_packages 
      SET name = ?, technology_type = ?, license_type = ?, download_speed = ?, upload_speed = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `;

    try {
      logger.db('UPDATE', 'service_packages', { servicePackageId, userId, name, technologyType, licenseType, downloadSpeed, uploadSpeed });
      const result = db.prepare(query).run(
        name.trim(),
        technologyType && technologyType.trim() ? technologyType.trim() : null,
        licenseType && licenseType.trim() ? licenseType.trim() : null,
        downloadSpeed ? downloadSpeed.trim() : null,
        uploadSpeed ? uploadSpeed.trim() : null,
        servicePackageId,
        userId
      );

      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating service package', error);
      throw error;
    }
  }

  /**
   * Check if a service package is used in any communities
   * Returns array of communities using this package
   */
  findCommunitiesUsingPackage(userId, packageName, packageDownloadSpeed, packageUploadSpeed) {
    const db = getDatabase();
    
    // Get all communities for this user via their companies
    const query = `
      SELECT c.id, c.name, c.technologies, co.name as company_name
      FROM communities c
      INNER JOIN companies co ON c.company_id = co.id
      WHERE co.user_id = ?
    `;

    try {
      logger.db('SELECT', 'communities', { userId, packageName });
      const communities = db.prepare(query).all(userId);
      const usingCommunities = [];

      communities.forEach(community => {
        if (!community.technologies) return;
        
        let technologies;
        try {
          technologies = typeof community.technologies === 'string' 
            ? JSON.parse(community.technologies) 
            : community.technologies;
        } catch (e) {
          return;
        }

        if (!Array.isArray(technologies)) return;

        // Check each technology's packages for a match
        technologies.forEach(tech => {
          if (!tech.packages || !Array.isArray(tech.packages)) return;
          
          tech.packages.forEach(pkg => {
            // Match by name, download speed, and upload speed
            if (pkg.name === packageName &&
                pkg.downloadSpeed === packageDownloadSpeed &&
                pkg.uploadSpeed === packageUploadSpeed) {
              usingCommunities.push({
                id: community.id,
                name: community.name,
                companyName: community.company_name,
                technologyType: tech.type
              });
            }
          });
        });
      });

      return usingCommunities;
    } catch (error) {
      logger.error('Error finding communities using package', error);
      throw error;
    }
  }

  /**
   * Delete a service package
   */
  delete(servicePackageId, userId) {
    const db = getDatabase();
    const query = 'DELETE FROM service_packages WHERE id = ? AND user_id = ?';

    try {
      logger.db('DELETE', 'service_packages', { servicePackageId, userId });
      const result = db.prepare(query).run(servicePackageId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting service package', error);
      throw error;
    }
  }
}

module.exports = new ServicePackageRepository();
