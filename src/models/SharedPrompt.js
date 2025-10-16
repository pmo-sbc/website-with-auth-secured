/**
 * SharedPrompt Model
 * Handles database operations for shared prompts
 */

const { getDatabase } = require('../db');
const crypto = require('crypto');
const logger = require('../utils/logger');

class SharedPrompt {
  /**
   * Create a shared prompt with a unique token
   */
  static create(userId, templateName, category, promptText, expiresInDays = null) {
    const db = getDatabase();
    const shareToken = crypto.randomBytes(16).toString('hex');

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = db.prepare(
      `INSERT INTO shared_prompts (share_token, user_id, template_name, category, prompt_text, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(shareToken, userId, templateName, category, promptText, expiresAt);

    logger.info(`Shared prompt created: ${shareToken}`, { userId, templateName });
    return shareToken;
  }

  /**
   * Get shared prompt by token
   */
  static getByToken(shareToken) {
    const db = getDatabase();
    const prompt = db.prepare(
      'SELECT * FROM shared_prompts WHERE share_token = ?'
    ).get(shareToken);

    if (!prompt) return null;

    // Check if expired
    if (prompt.expires_at && new Date(prompt.expires_at) < new Date()) {
      return null;
    }

    // Increment view count
    db.prepare(
      'UPDATE shared_prompts SET views = views + 1 WHERE share_token = ?'
    ).run(shareToken);

    return prompt;
  }

  /**
   * Get all shared prompts by user
   */
  static getByUser(userId) {
    const db = getDatabase();
    return db.prepare(
      `SELECT * FROM shared_prompts
       WHERE user_id = ?
       ORDER BY created_at DESC`
    ).all(userId);
  }

  /**
   * Delete a shared prompt
   */
  static delete(shareToken, userId) {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM shared_prompts WHERE share_token = ? AND user_id = ?'
    ).run(shareToken, userId);

    logger.info(`Shared prompt deleted: ${shareToken}`);
    return result.changes > 0;
  }

  /**
   * Delete expired shared prompts (cleanup)
   */
  static deleteExpired() {
    const db = getDatabase();
    const result = db.prepare(
      'DELETE FROM shared_prompts WHERE expires_at < CURRENT_TIMESTAMP'
    ).run();

    logger.info(`Deleted ${result.changes} expired shared prompts`);
    return result.changes;
  }
}

module.exports = SharedPrompt;
