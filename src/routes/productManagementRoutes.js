/**
 * Product Management Routes (Admin Only)
 * Handles CRUD operations for products
 */

const express = require('express');
const productRepository = require('../db/productRepository');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureCsrf } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /api/admin/products
 * Get all products (admin only)
 */
router.get(
  '/api/admin/products',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const products = productRepository.findAll(includeInactive);
    
    // Get purchase counts for each product
    const productsWithStats = products.map(product => ({
      ...product,
      purchase_count: productRepository.getPurchaseCount(product.id)
    }));

    res.json({
      success: true,
      products: productsWithStats
    });
  })
);

/**
 * GET /api/admin/products/:id
 * Get a single product (admin only)
 */
router.get(
  '/api/admin/products/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = productRepository.findById(parseInt(req.params.id));
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const purchaseCount = productRepository.getPurchaseCount(product.id);

    res.json({
      success: true,
      product: {
        ...product,
        purchase_count: purchaseCount
      }
    });
  })
);

/**
 * POST /api/admin/products
 * Create a new product (admin only)
 */
router.post(
  '/api/admin/products',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const { name, price, description } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
    }

    const product = productRepository.create(name, price, description || null);

    logger.info('Product created', {
      userId: req.session.userId,
      productId: product.id,
      productName: product.name
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  })
);

/**
 * PUT /api/admin/products/:id
 * Update a product (admin only)
 */
router.put(
  '/api/admin/products/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);
    const { name, price, description, is_active } = req.body;

    const existingProduct = productRepository.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
    }

    const updated = productRepository.update(productId, {
      name: name || existingProduct.name,
      price: price !== undefined ? price : existingProduct.price,
      description: description !== undefined ? description : existingProduct.description,
      is_active: is_active !== undefined ? is_active : existingProduct.is_active
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update product'
      });
    }

    logger.info('Product updated', {
      userId: req.session.userId,
      productId,
      changes: req.body
    });

    const updatedProduct = productRepository.findById(productId);
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  })
);

/**
 * DELETE /api/admin/products/:id
 * Delete a product (admin only)
 */
router.delete(
  '/api/admin/products/:id',
  requireAuth,
  requireAdmin,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const productId = parseInt(req.params.id);

    const product = productRepository.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const deleted = productRepository.delete(productId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete product'
      });
    }

    logger.info('Product deleted', {
      userId: req.session.userId,
      productId,
      productName: product.name
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  })
);

module.exports = router;

