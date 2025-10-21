/**
 * Page Routes
 * Routes for serving HTML pages
 */

const express = require('express');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /
 * Home page or dashboard if logged in
 */
router.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
  }
});

/**
 * GET /dashboard
 * User dashboard (protected)
 */
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'dashboard.html'));
});

/**
 * GET /templates
 * Templates page (public or protected depending on requirements)
 */
router.get('/templates', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'templates.html'));
});

/**
 * GET /about
 * About page
 */
router.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'about.html'));
});

/**
 * GET /admin-analytics
 * Admin analytics dashboard (protected)
 */
router.get('/admin-analytics', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-analytics.html'));
});

module.exports = router;
