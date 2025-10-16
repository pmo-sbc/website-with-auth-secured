/**
 * Authentication Routes
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userRepository = require('../db/userRepository');
const emailService = require('../services/emailService');
const validators = require('../validators');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { configureAuthRateLimit, configureCsrf, sendCsrfToken } = require('../middleware/security');
const { redirectIfAuthenticated } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');

const router = express.Router();
const authLimiter = configureAuthRateLimit();
const csrfProtection = configureCsrf();

/**
 * GET /login
 * Serve login page
 */
router.get('/login', csrfProtection, sendCsrfToken, redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'login.html'));
});

/**
 * GET /signup
 * Serve signup page
 */
router.get('/signup', csrfProtection, sendCsrfToken, redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'signup.html'));
});

/**
 * POST /api/register
 * Register new user
 */
router.post(
  '/api/register',
  authLimiter,
  csrfProtection,
  validators.register,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = userRepository.findByUsernameOrEmail(username, email);

    if (existingUser) {
      logger.warn('Registration attempt with existing credentials', { username, email });
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const newUser = userRepository.create(username, email, hashedPassword);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    userRepository.setVerificationToken(newUser.id, verificationToken, expiresAt.toISOString());

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, username, verificationToken);
      logger.info('Verification email sent', {
        userId: newUser.id,
        email
      });
    } catch (error) {
      logger.error('Failed to send verification email', error);
      // Continue anyway - user can resend
    }

    logger.info('User registered successfully', {
      userId: newUser.id,
      username: newUser.username
    });

    // Do NOT create session until email is verified
    res.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      email: email
    });
  })
);

/**
 * POST /api/login
 * Login user
 */
router.post(
  '/api/login',
  authLimiter,
  csrfProtection,
  validators.login,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { username, password, rememberMe } = req.body;

    // Find user
    const user = userRepository.findByUsernameOrEmail(username);

    if (!user) {
      logger.warn('Login attempt with invalid username', { username });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.warn('Login attempt with invalid password', {
        userId: user.id,
        username: user.username
      });
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      logger.warn('Login attempt with unverified email', {
        userId: user.id,
        email: user.email
      });
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;

    // If remember me is checked, extend cookie duration to 30 days
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      rememberMe: !!rememberMe
    });

    res.json({
      success: true,
      message: 'Login successful',
      username: user.username
    });
  })
);

/**
 * POST /api/logout
 * Logout user
 */
router.post('/api/logout', csrfProtection, (req, res) => {
  const userId = req.session.userId;

  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout failed', err);
      return res.status(500).json({
        error: 'Logout failed'
      });
    }

    logger.info('User logged out', { userId });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/user
 * Get current user information
 */
router.get('/api/user', asyncHandler(async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Not authenticated'
    });
  }

  const user = userRepository.findById(req.session.userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  res.json(user);
}));

/**
 * GET /api/session/status
 * Check session status and get session info
 */
router.get('/api/session/status', asyncHandler(async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({
      authenticated: false,
      expiresIn: null,
      username: null
    });
  }

  // Get user details to include is_admin
  const user = userRepository.findById(req.session.userId);

  // Calculate time until session expires
  const expiresIn = req.session.cookie.maxAge;
  const expiresAt = new Date(Date.now() + expiresIn);

  res.json({
    authenticated: true,
    expiresIn: expiresIn,
    expiresAt: expiresAt.toISOString(),
    username: req.session.username,
    userId: req.session.userId,
    is_admin: user ? user.is_admin : false,
    tokens: user ? user.tokens : 0
  });
}));

/**
 * GET /verify-email
 * Serve email verification page
 */
router.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'verify-email.html'));
});

/**
 * POST /api/verify-email
 * Verify email with token
 */
router.post(
  '/api/verify-email',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    // Find user by verification token
    const user = userRepository.findByVerificationToken(token);

    if (!user) {
      logger.warn('Invalid or expired verification token', { token });
      return res.status(400).json({
        error: 'Invalid or expired verification token',
        message: 'This verification link is invalid or has expired. Please request a new one.'
      });
    }

    // Verify email
    const verified = userRepository.verifyEmail(user.id);

    if (!verified) {
      logger.error('Failed to verify email', { userId: user.id });
      return res.status(500).json({
        error: 'Failed to verify email',
        message: 'An error occurred while verifying your email. Please try again.'
      });
    }

    logger.info('Email verified successfully', {
      userId: user.id,
      email: user.email
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.username);
      logger.info('Welcome email sent', { userId: user.id });
    } catch (error) {
      logger.error('Failed to send welcome email', error);
      // Continue anyway - user is verified
    }

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      username: user.username
    });
  })
);

/**
 * POST /api/resend-verification
 * Resend verification email
 */
router.post(
  '/api/resend-verification',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Find user by email
    const user = userRepository.findByUsernameOrEmail(email, email);

    if (!user) {
      // Don't reveal if user exists
      logger.warn('Verification resend attempt for non-existent email', { email });
      return res.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.'
      });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'This email is already verified. You can log in now.'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save verification token
    userRepository.setVerificationToken(user.id, verificationToken, expiresAt.toISOString());

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.username, verificationToken);
      logger.info('Verification email resent', {
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      logger.error('Failed to resend verification email', error);
      return res.status(500).json({
        error: 'Failed to send verification email',
        message: 'An error occurred while sending the email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  })
);

module.exports = router;
