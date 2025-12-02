/**
 * Order Routes
 * Handles order processing and confirmation
 */

const express = require('express');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');
const orderRepository = require('../db/orderRepository');
const discountCodeRepository = require('../db/discountCodeRepository');
const userRepository = require('../db/userRepository');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/orders/process
 * Process an order and send confirmation email
 */
router.post(
  '/orders/process',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { customer, order, payment } = req.body;

    // Validate required fields
    if (!customer || !order || !customer.email) {
      return res.status(400).json({
        error: 'Missing required order information'
      });
    }

    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        error: 'Order must contain at least one item'
      });
    }

    // Process payment if total is greater than 0
    let paymentResult = { success: true };
    if (order.total > 0 && payment) {
      try {
        if (payment.method === 'paypal') {
          paymentResult = await paymentService.processPayPalPayment(payment, order.total);
        } else {
          // Default to card payment
          paymentResult = await paymentService.processPayment(payment, order.total);
        }

        if (!paymentResult.success) {
          return res.status(400).json({
            success: false,
            error: paymentResult.error || 'Payment processing failed',
            paymentError: paymentResult.stripeError
          });
        }

        logger.info('Payment processed successfully', {
          userId,
          paymentIntentId: paymentResult.paymentIntentId || paymentResult.orderId,
          amount: order.total,
          method: payment.method
        });
      } catch (paymentError) {
        logger.error('Payment processing error', {
          error: paymentError.message,
          userId,
          amount: order.total
        });
        return res.status(400).json({
          success: false,
          error: 'Payment processing failed. Please try again.',
          paymentError: paymentError.message
        });
      }
    }

    try {
      // Check if discount code was used and get its ID
      let discountCodeId = null;
      const discountCode = req.body.discountCode;
      if (discountCode) {
        const discountCodeData = discountCodeRepository.findByCode(discountCode);
        if (discountCodeData) {
          discountCodeId = discountCodeData.id;
          // Increment usage count
          discountCodeRepository.incrementUsage(discountCodeId);
        }
      }

      // Save order to database FIRST (before email)
      const orderData = {
        customer,
        order,
        payment: payment ? {
          method: payment.method,
          paymentIntentId: paymentResult.paymentIntentId || paymentResult.orderId || null,
          status: paymentResult.status || 'completed'
        } : null,
        discountCodeId: discountCodeId
      };
      
      logger.info('Attempting to save order', {
        userId,
        email: customer.email,
        itemCount: order.items.length,
        total: order.total,
        discountCodeId
      });

      let savedOrder;
      try {
        savedOrder = orderRepository.create(userId, orderData);
        logger.info('Order saved successfully', {
          userId,
          orderId: savedOrder.id,
          orderNumber: savedOrder.orderNumber
        });
      } catch (saveError) {
        logger.error('Failed to save order to database', {
          error: saveError.message,
          stack: saveError.stack,
          userId,
          email: customer.email
        });
        throw new Error(`Failed to save order: ${saveError.message}`);
      }

      // Process token purchases if any
      try {
        const tokensPerPurchase = 100; // Fixed: each "Tokens" product purchase gives 100 tokens
        let totalTokensToAdd = 0;

        // Get tokens product ID from database for more reliable matching
        const productRepository = require('../db/productRepository');
        const tokensProduct = productRepository.findAll().find(p => 
          p.name === 'Tokens' || p.name.toLowerCase() === 'tokens'
        );
        const tokensProductId = tokensProduct ? tokensProduct.id : null;

        logger.info('Processing token purchases', {
          userId,
          tokensProductId,
          orderItems: order.items,
          itemCount: order.items.length
        });

        // Check if order contains "Tokens" product (match by name or ID)
        order.items.forEach(item => {
          const isTokensProduct = 
            (item.name === 'Tokens' || item.name.toLowerCase() === 'tokens') ||
            (tokensProductId && item.id === tokensProductId);
          
          if (isTokensProduct) {
            const quantity = item.quantity || 1;
            const tokensForThisItem = tokensPerPurchase * quantity;
            totalTokensToAdd += tokensForThisItem;
            logger.info('Found tokens purchase in order', {
              userId,
              itemId: item.id,
              itemName: item.name,
              quantity,
              tokensToAdd: tokensForThisItem
            });
          }
        });

        // Add tokens to user account if tokens were purchased
        if (totalTokensToAdd > 0) {
          // Get current token balance before adding
          const currentTokens = userRepository.getTokens(userId);
          logger.info('Adding tokens to user account', {
            userId,
            currentTokens,
            tokensToAdd: totalTokensToAdd,
            expectedNewBalance: currentTokens + totalTokensToAdd
          });

          const tokensAdded = userRepository.addTokens(userId, totalTokensToAdd);
          
          if (tokensAdded) {
            // Verify tokens were added
            const newTokens = userRepository.getTokens(userId);
            logger.info('Tokens added to user account successfully', {
              userId,
              tokensAdded: totalTokensToAdd,
              previousBalance: currentTokens,
              newBalance: newTokens,
              orderNumber: savedOrder.orderNumber
            });
          } else {
            logger.warn('Failed to add tokens to user account - addTokens returned false', {
              userId,
              tokensToAdd: totalTokensToAdd,
              currentTokens
            });
          }
        } else {
          logger.info('No tokens product found in order', {
            userId,
            orderItems: order.items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity }))
          });
        }
      } catch (tokenError) {
        // Log error but don't fail the order - tokens can be added manually if needed
        logger.error('Error processing token purchase', {
          error: tokenError.message,
          stack: tokenError.stack,
          userId,
          orderNumber: savedOrder.orderNumber
        });
      }

      // Send order confirmation email (non-blocking)
      let emailResult = { success: false };
      try {
        const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Customer';
        emailResult = await emailService.sendOrderConfirmationEmail(
          customer.email,
          customerName,
          order
        );

        if (!emailResult.success) {
          logger.warn('Failed to send order confirmation email', {
            email: customer.email,
            error: emailResult.error,
            orderNumber: savedOrder.orderNumber
          });
          // Continue anyway - order is already saved
        }
      } catch (emailError) {
        logger.warn('Error sending order confirmation email', {
          error: emailError.message,
          orderNumber: savedOrder.orderNumber
        });
        // Continue anyway - order is already saved
      }

      // Calculate tokens added for response
      const tokensPerPurchase = 100;
      let totalTokensAdded = 0;
      order.items.forEach(item => {
        if (item.name === 'Tokens' || item.name.toLowerCase() === 'tokens') {
          const quantity = item.quantity || 1;
          totalTokensAdded += tokensPerPurchase * quantity;
        }
      });

      logger.info('Order processed successfully', {
        userId,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        email: customer.email,
        orderTotal: order.total,
        itemCount: order.items.length,
        tokensAdded: totalTokensAdded,
        emailSent: emailResult.success
      });

      res.json({
        success: true,
        message: 'Order processed successfully',
        order: {
          id: savedOrder.id,
          orderNumber: savedOrder.orderNumber,
          items: order.items,
          subtotal: order.subtotal,
          discount: order.discount || 0,
          total: order.total,
          createdAt: new Date().toISOString()
        },
        tokensAdded: totalTokensAdded > 0 ? totalTokensAdded : undefined,
        emailSent: emailResult.success
      });
    } catch (error) {
      logger.error('Error processing order', {
        error: error.message,
        stack: error.stack,
        userId,
        email: customer.email
      });
      throw error;
    }
  })
);

/**
 * POST /api/paypal/create-order
 * Create a PayPal order for checkout
 */
router.post(
  '/paypal/create-order',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    try {
      const result = await paymentService.createPayPalOrder(amount);

      if (result.success) {
        res.json({
          success: true,
          orderId: result.orderId
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to create PayPal order'
        });
      }
    } catch (error) {
      logger.error('Error creating PayPal order', {
        error: error.message,
        userId: req.session.userId
      });
      res.status(500).json({
        success: false,
        error: 'Failed to create PayPal order. Please try again.'
      });
    }
  })
);

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
router.get(
  '/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    try {
      const orders = orderRepository.findByUserId(userId, limit, offset);
      const totalCount = orderRepository.countByUserId(userId);

      res.json({
        success: true,
        orders,
        total: totalCount,
        limit,
        offset
      });
    } catch (error) {
      logger.error('Error fetching orders', {
        error: error.message,
        userId
      });
      throw error;
    }
  })
);

module.exports = router;

