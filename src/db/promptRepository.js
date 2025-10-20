/**
 * Prompt Repository
 * Data access layer for prompt operations
 */

const { getDatabase } = require('./index');
const logger = require('../utils/logger');

class PromptRepository {
  /**
   * Save a new prompt
   */
  create(userId, templateName, category, promptText, inputs = {}, projectId = null) {
    const db = getDatabase();
    const query = `
      INSERT INTO saved_prompts (user_id, template_name, category, prompt_text, inputs, project_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      logger.db('INSERT', 'saved_prompts', { userId, templateName, projectId });
      const result = db.prepare(query).run(
        userId,
        templateName,
        category,
        promptText,
        JSON.stringify(inputs),
        projectId
      );

      return {
        id: result.lastInsertRowid,
        userId,
        templateName,
        category,
        promptText,
        inputs,
        projectId
      };
    } catch (error) {
      logger.error('Error saving prompt', error);
      throw error;
    }
  }

  /**
   * Get all prompts for a user
   */
  findByUserId(userId, limit = 100, offset = 0) {
    const db = getDatabase();
    const query = `
      SELECT * FROM saved_prompts
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      logger.db('SELECT', 'saved_prompts', { userId, limit, offset });
      const prompts = db.prepare(query).all(userId, limit, offset);

      // Parse JSON inputs
      return prompts.map(prompt => ({
        ...prompt,
        inputs: JSON.parse(prompt.inputs)
      }));
    } catch (error) {
      logger.error('Error retrieving prompts', error);
      throw error;
    }
  }

  /**
   * Get a specific prompt by ID
   */
  findById(promptId, userId) {
    const db = getDatabase();
    const query = 'SELECT * FROM saved_prompts WHERE id = ? AND user_id = ?';

    try {
      logger.db('SELECT', 'saved_prompts', { promptId, userId });
      const prompt = db.prepare(query).get(promptId, userId);

      if (prompt) {
        prompt.inputs = JSON.parse(prompt.inputs);
      }

      return prompt;
    } catch (error) {
      logger.error('Error finding prompt', error);
      throw error;
    }
  }

  /**
   * Update prompt's project assignment
   */
  updateProject(promptId, userId, projectId) {
    const db = getDatabase();
    const query = 'UPDATE saved_prompts SET project_id = ? WHERE id = ? AND user_id = ?';

    try {
      logger.db('UPDATE', 'saved_prompts', { promptId, userId, projectId });
      const result = db.prepare(query).run(projectId, promptId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating prompt project', error);
      throw error;
    }
  }

  /**
   * Delete a prompt
   */
  delete(promptId, userId) {
    const db = getDatabase();
    const query = 'DELETE FROM saved_prompts WHERE id = ? AND user_id = ?';

    try {
      logger.db('DELETE', 'saved_prompts', { promptId, userId });
      const result = db.prepare(query).run(promptId, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting prompt', error);
      throw error;
    }
  }

  /**
   * Get count of saved prompts for a user
   */
  countByUserId(userId) {
    const db = getDatabase();
    const query = 'SELECT COUNT(*) as count FROM saved_prompts WHERE user_id = ?';

    try {
      const result = db.prepare(query).get(userId);
      return result.count;
    } catch (error) {
      logger.error('Error counting prompts', error);
      throw error;
    }
  }

  /**
   * Search prompts by template name or category
   */
  search(userId, searchTerm) {
    const db = getDatabase();
    const query = `
      SELECT * FROM saved_prompts
      WHERE user_id = ?
      AND (template_name LIKE ? OR category LIKE ? OR prompt_text LIKE ?)
      ORDER BY created_at DESC
    `;

    try {
      const term = `%${searchTerm}%`;
      logger.db('SELECT', 'saved_prompts', { userId, searchTerm });
      const prompts = db.prepare(query).all(userId, term, term, term);

      return prompts.map(prompt => ({
        ...prompt,
        inputs: JSON.parse(prompt.inputs)
      }));
    } catch (error) {
      logger.error('Error searching prompts', error);
      throw error;
    }
  }
}

module.exports = new PromptRepository();
