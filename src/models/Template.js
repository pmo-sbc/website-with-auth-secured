/**
 * Template Model
 * Handles database operations for templates
 */

const { getDatabase } = require('../db');
const logger = require('../utils/logger');

class Template {
  /**
   * Get all active templates (Marketing only)
   */
  static getAll(includeInactive = false) {
    const db = getDatabase();
    const query = includeInactive
      ? 'SELECT * FROM templates WHERE category = \'Marketing\' ORDER BY category, subcategory, name'
      : 'SELECT * FROM templates WHERE is_active = 1 AND category = \'Marketing\' ORDER BY category, subcategory, name';

    const templates = db.prepare(query).all();

    // Parse JSON inputs field
    return templates.map(template => ({
      ...template,
      inputs: JSON.parse(template.inputs),
      is_premium: Boolean(template.is_premium),
      is_active: Boolean(template.is_active)
    }));
  }

  /**
   * Get templates by category
   */
  static getByCategory(category) {
    const db = getDatabase();
    const templates = db.prepare(
      'SELECT * FROM templates WHERE category = ? AND is_active = 1 ORDER BY subcategory, name'
    ).all(category);

    return templates.map(template => ({
      ...template,
      inputs: JSON.parse(template.inputs),
      is_premium: Boolean(template.is_premium),
      is_active: Boolean(template.is_active)
    }));
  }

  /**
   * Get templates by subcategory
   */
  static getBySubcategory(subcategory) {
    const db = getDatabase();
    const templates = db.prepare(
      'SELECT * FROM templates WHERE subcategory = ? AND is_active = 1 ORDER BY name'
    ).all(subcategory);

    return templates.map(template => ({
      ...template,
      inputs: JSON.parse(template.inputs),
      is_premium: Boolean(template.is_premium),
      is_active: Boolean(template.is_active)
    }));
  }

  /**
   * Get template by ID
   */
  static getById(id) {
    const db = getDatabase();
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);

    if (!template) return null;

    return {
      ...template,
      inputs: JSON.parse(template.inputs),
      is_premium: Boolean(template.is_premium),
      is_active: Boolean(template.is_active)
    };
  }

  /**
   * Search templates by name or description (Marketing only)
   */
  static search(searchTerm) {
    const db = getDatabase();
    const templates = db.prepare(
      `SELECT * FROM templates
       WHERE (name LIKE ? OR description LIKE ?) AND is_active = 1 AND category = "Marketing"
       ORDER BY category, subcategory, name`
    ).all(`%${searchTerm}%`, `%${searchTerm}%`);

    return templates.map(template => ({
      ...template,
      inputs: JSON.parse(template.inputs),
      is_premium: Boolean(template.is_premium),
      is_active: Boolean(template.is_active)
    }));
  }

  /**
   * Create a new template
   */
  static create(templateData) {
    const db = getDatabase();
    const { name, category, subcategory, description, prompt_template, inputs, is_premium = false } = templateData;

    const result = db.prepare(
      `INSERT INTO templates (name, category, subcategory, description, prompt_template, inputs, is_premium)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(name, category, subcategory, description, prompt_template, JSON.stringify(inputs), is_premium ? 1 : 0);

    logger.info(`Template created: ${name}`, { id: result.lastInsertRowid });
    return result.lastInsertRowid;
  }

  /**
   * Update a template
   */
  static update(id, templateData) {
    const db = getDatabase();
    const { name, category, subcategory, description, prompt_template, inputs, is_premium, is_active } = templateData;

    const result = db.prepare(
      `UPDATE templates
       SET name = ?, category = ?, subcategory = ?, description = ?,
           prompt_template = ?, inputs = ?, is_premium = ?, is_active = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      name, category, subcategory, description, prompt_template,
      JSON.stringify(inputs), is_premium ? 1 : 0, is_active ? 1 : 0, id
    );

    logger.info(`Template updated: ${id}`);
    return result.changes > 0;
  }

  /**
   * Delete a template (soft delete by setting is_active = false)
   */
  static softDelete(id) {
    const db = getDatabase();
    const result = db.prepare('UPDATE templates SET is_active = 0 WHERE id = ?').run(id);
    logger.info(`Template soft deleted: ${id}`);
    return result.changes > 0;
  }

  /**
   * Permanently delete a template
   */
  static hardDelete(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    logger.info(`Template permanently deleted: ${id}`);
    return result.changes > 0;
  }

  /**
   * Get all categories (Marketing only)
   */
  static getCategories() {
    const db = getDatabase();
    const categories = db.prepare(
      'SELECT DISTINCT category FROM templates WHERE is_active = 1 AND category = "Marketing" ORDER BY category'
    ).all();
    return categories.map(row => row.category);
  }

  /**
   * Get subcategories by category
   */
  static getSubcategories(category) {
    const db = getDatabase();
    const subcategories = db.prepare(
      'SELECT DISTINCT subcategory FROM templates WHERE category = ? AND is_active = 1 ORDER BY subcategory'
    ).all(category);
    return subcategories.map(row => row.subcategory);
  }

  /**
   * Get template structure grouped by category and subcategory
   */
  static getStructured() {
    const templates = this.getAll();
    const structured = {};

    templates.forEach(template => {
      if (!structured[template.category]) {
        structured[template.category] = {};
      }
      if (!structured[template.category][template.subcategory]) {
        structured[template.category][template.subcategory] = [];
      }
      structured[template.category][template.subcategory].push(template);
    });

    return structured;
  }

  /**
   * Save a template for a user
   */
  static saveForUser(userId, templateId) {
    const db = getDatabase();
    try {
      db.prepare(
        'INSERT INTO user_saved_templates (user_id, template_id) VALUES (?, ?)'
      ).run(userId, templateId);
      logger.info(`Template ${templateId} saved for user ${userId}`);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        // Already saved
        return false;
      }
      throw error;
    }
  }

  /**
   * Unsave a template for a user
   */
  static unsaveForUser(userId, templateId) {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM user_saved_templates WHERE user_id = ? AND template_id = ?'
    ).run(userId, templateId);
    logger.info(`Template ${templateId} unsaved for user ${userId}`);
    return result.changes > 0;
  }

  /**
   * Get user's saved templates
   */
  static getUserSaved(userId) {
    const db = getDatabase();
    const templates = db.prepare(
      `SELECT t.*, ust.saved_at
       FROM templates t
       INNER JOIN user_saved_templates ust ON t.id = ust.template_id
       WHERE ust.user_id = ? AND t.is_active = 1
       ORDER BY ust.saved_at DESC`
    ).all(userId);

    return templates.map(template => ({
      ...template,
      inputs: JSON.parse(template.inputs),
      is_premium: Boolean(template.is_premium),
      is_active: Boolean(template.is_active)
    }));
  }

  /**
   * Check if a template is saved by user
   */
  static isSavedByUser(userId, templateId) {
    const db = getDatabase();
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM user_saved_templates WHERE user_id = ? AND template_id = ?'
    ).get(userId, templateId);
    return result.count > 0;
  }
}

module.exports = Template;
