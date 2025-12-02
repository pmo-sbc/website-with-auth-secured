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
 * GET /product
 * Product page
 */
router.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'product.html'));
});

/**
 * GET /cart
 * Shopping cart page
 */
router.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'cart.html'));
});

/**
 * GET /checkout
 * Checkout page
 */
router.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'checkout.html'));
});

/**
 * GET /order-success
 * Order confirmation success page
 */
router.get('/order-success', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'order-success.html'));
});

/**
 * GET /admin-analytics
 * Admin analytics dashboard (protected)
 */
router.get('/admin-analytics', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-analytics.html'));
});

/**
 * GET /admin/products
 * Admin product management page (protected, admin only)
 */
router.get('/admin/products', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-products.html'));
});

module.exports = router;
