/**
 * AI Prompt Templates - Main Server
 * Refactored for maintainability, scalability, and testability
 */

const express = require('express');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');

// Import configuration
const config = require('./src/config');

// Import utilities
const logger = require('./src/utils/logger');

// Import database
const { initializeDatabase, closeDatabase, getDatabase } = require('./src/db');

// Import middleware
const { configureHelmet, configureApiRateLimit, securityHeaders } = require('./src/middleware/security');
const { sanitizeBody } = require('./src/middleware/validation');
const { attachUser } = require('./src/middleware/auth');
const {
  requestLogger,
  notFoundHandler,
  globalErrorHandler
} = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const promptRoutes = require('./src/routes/promptRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const pageRoutes = require('./src/routes/pageRoutes');
const templateRoutes = require('./src/routes/templateRoutes');
const userManagementRoutes = require('./src/routes/userManagementRoutes');
const generatePromptRoutes = require('./src/routes/generatePromptRoutes');
const projectRoutes = require('./src/routes/projectRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const adminTemplateRoutes = require('./src/routes/adminTemplateRoutes');
const healthRoutes = require('./src/routes/healthRoutes');
const activityLogRoutes = require('./src/routes/activityLogRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

// Initialize Express app
const app = express();

// Trust proxy - required for production behind reverse proxies (Nginx, Apache, Cloudflare, etc.)
// This ensures req.ip and secure cookies work correctly
if (config.isProduction) {
  app.set('trust proxy', 1); // Trust first proxy
  logger.info('Trust proxy enabled for production');
}

// Initialize database
try {
  initializeDatabase();
  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Failed to initialize database', error);
  process.exit(1);
}

// ===== MIDDLEWARE SETUP =====

// 1. Request logging (first middleware to capture all requests)
app.use(requestLogger);

// 2. Security headers
app.use(configureHelmet());
app.use(securityHeaders);

// 3. Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sanitizeBody);

// 4. Cookie parser (required for CSRF)
app.use(cookieParser());

// 5. Static files
app.use(express.static(path.join(__dirname, 'public')));

// 6. Session configuration with SQLite store
const sessionStore = new SqliteStore({
  client: getDatabase(),
  expired: {
    clear: true,
    intervalMs: 900000 // Clear expired sessions every 15 minutes
  }
});

app.use(session({
  ...config.session,
  store: sessionStore
}));

// 7. Attach user info to request
app.use(attachUser);

// 8. Rate limiting for API routes
app.use('/api/', configureApiRateLimit());

// ===== ROUTES =====

// Health check routes (no auth required, should be first)
app.use('/', healthRoutes);

// Authentication routes (includes /login, /signup, /api/register, /api/login, /api/logout, /api/user)
app.use('/', authRoutes);

// Page routes (/, /dashboard, /templates, /about)
app.use('/', pageRoutes);

// User management routes
app.use('/', userManagementRoutes);

// Project routes
app.use('/', projectRoutes);

// Profile routes
app.use('/', profileRoutes);

// Admin template management routes
app.use('/admin', adminTemplateRoutes);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Prompt Templates API',
  customfavIcon: '/favicon.png'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/prompts', promptRoutes);
app.use('/api/usage', statsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api', generatePromptRoutes);
app.use('/api', projectRoutes);
app.use('/api/activity', activityLogRoutes);
app.use('/api/analytics', analyticsRoutes);

// ===== ERROR HANDLING =====

// 404 handler (must be after all other routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// ===== SERVER STARTUP =====

const server = app.listen(config.port, () => {
  logger.info(`Server started on port ${config.port}`, {
    environment: config.nodeEnv,
    url: `http://localhost:${config.port}`
  });

  if (!config.isProduction) {
    logger.info('Development mode enabled - verbose logging active');
  }
});

// ===== GRACEFUL SHUTDOWN =====

function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    closeDatabase();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = app; // Export for testing
