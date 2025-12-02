/**
 * Public Product Routes
 * Handles public access to products and discount codes
 */

const express = require('express');
const productRepository = require('../db/productRepository');
const discountCodeRepository = require('../db/discountCodeRepository');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /api/products
 * Get all active products (public)
 */
router.get(
  '/api/products',
  asyncHandler(async (req, res) => {
    const products = productRepository.findAll(false); // Only active products
    res.json({
      success: true,
      products
    });
  })
);

/**
 * GET /api/products/:id
 * Get a single product (public)
 */
router.get(
  '/api/products/:id',
  asyncHandler(async (req, res) => {
    const product = productRepository.findById(parseInt(req.params.id));
    
    if (!product || !product.is_active) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  })
);

/**
 * POST /api/discount-codes/validate
 * Validate a discount code (public)
 */
router.post(
  '/api/discount-codes/validate',
  asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Discount code is required'
      });
    }

    const discountCode = discountCodeRepository.findByCode(code);

    if (!discountCode) {
      return res.json({
        success: false,
        valid: false,
        error: 'Invalid discount code'
      });
    }

    res.json({
      success: true,
      valid: true,
      discountCode: {
        id: discountCode.id,
        code: discountCode.code,
        discount_percentage: discountCode.discount_percentage
      }
    });
  })
);

module.exports = router;

