/**
 * Template Routes
 * API endpoints for template management
 */

const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const SharedPrompt = require('../models/SharedPrompt');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * GET /api/templates
 * Get all templates (structured by category/subcategory)
 */
router.get('/', (req, res) => {
  try {
    const structured = Template.getStructured();
    logger.debug('Returning templates:', { count: Object.keys(structured).length, categories: Object.keys(structured) });
    res.json(structured);
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/templates/categories
 * Get all categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = Template.getCategories();
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/templates/category/:category
 * Get templates by category
 */
router.get('/category/:category', (req, res) => {
  try {
    const templates = Template.getByCategory(req.params.category);
    res.json(templates);
  } catch (error) {
    logger.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/templates/subcategory/:subcategory
 * Get templates by subcategory
 */
router.get('/subcategory/:subcategory', (req, res) => {
  try {
    const templates = Template.getBySubcategory(req.params.subcategory);
    res.json(templates);
  } catch (error) {
    logger.error('Error fetching templates by subcategory:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/templates/search
 * Search templates
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const templates = Template.search(q);
    res.json(templates);
  } catch (error) {
    logger.error('Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get('/:id', (req, res) => {
  try {
    const template = Template.getById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * POST /api/templates/:id/save
 * Save a template for user (requires auth)
 */
router.post('/:id/save', authenticateToken, (req, res) => {
  try {
    const saved = Template.saveForUser(req.userId, req.params.id);
    if (saved) {
      res.json({ success: true, message: 'Template saved' });
    } else {
      res.json({ success: false, message: 'Template already saved' });
    }
  } catch (error) {
    logger.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

/**
 * DELETE /api/templates/:id/save
 * Unsave a template for user (requires auth)
 */
router.delete('/:id/save', authenticateToken, (req, res) => {
  try {
    const unsaved = Template.unsaveForUser(req.userId, req.params.id);
    if (unsaved) {
      res.json({ success: true, message: 'Template unsaved' });
    } else {
      res.status(404).json({ error: 'Template was not saved' });
    }
  } catch (error) {
    logger.error('Error unsaving template:', error);
    res.status(500).json({ error: 'Failed to unsave template' });
  }
});

/**
 * GET /api/templates/saved/my
 * Get user's saved templates (requires auth)
 */
router.get('/saved/my', authenticateToken, (req, res) => {
  try {
    const templates = Template.getUserSaved(req.userId);
    res.json(templates);
  } catch (error) {
    logger.error('Error fetching saved templates:', error);
    res.status(500).json({ error: 'Failed to fetch saved templates' });
  }
});

/**
 * POST /api/templates/share
 * Create a shared prompt (requires auth)
 */
router.post('/share', authenticateToken, (req, res) => {
  try {
    const { templateName, category, promptText, expiresInDays } = req.body;

    if (!templateName || !category || !promptText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const shareToken = SharedPrompt.create(
      req.userId,
      templateName,
      category,
      promptText,
      expiresInDays
    );

    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${shareToken}`;
    res.json({ success: true, shareToken, shareUrl });
  } catch (error) {
    logger.error('Error creating shared prompt:', error);
    res.status(500).json({ error: 'Failed to create shared prompt' });
  }
});

/**
 * GET /api/templates/share/:token
 * Get shared prompt by token
 */
router.get('/share/:token', (req, res) => {
  try {
    const prompt = SharedPrompt.getByToken(req.params.token);
    if (!prompt) {
      return res.status(404).json({ error: 'Shared prompt not found or expired' });
    }
    res.json(prompt);
  } catch (error) {
    logger.error('Error fetching shared prompt:', error);
    res.status(500).json({ error: 'Failed to fetch shared prompt' });
  }
});

/**
 * GET /api/templates/share/my/list
 * Get user's shared prompts (requires auth)
 */
router.get('/share/my/list', authenticateToken, (req, res) => {
  try {
    const prompts = SharedPrompt.getByUser(req.userId);
    res.json(prompts);
  } catch (error) {
    logger.error('Error fetching shared prompts:', error);
    res.status(500).json({ error: 'Failed to fetch shared prompts' });
  }
});

/**
 * DELETE /api/templates/share/:token
 * Delete a shared prompt (requires auth)
 */
router.delete('/share/:token', authenticateToken, (req, res) => {
  try {
    const deleted = SharedPrompt.delete(req.params.token, req.userId);
    if (deleted) {
      res.json({ success: true, message: 'Shared prompt deleted' });
    } else {
      res.status(404).json({ error: 'Shared prompt not found' });
    }
  } catch (error) {
    logger.error('Error deleting shared prompt:', error);
    res.status(500).json({ error: 'Failed to delete shared prompt' });
  }
});

module.exports = router;
