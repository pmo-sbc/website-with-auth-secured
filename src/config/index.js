/**
 * Configuration Module
 * Centralizes all application configuration
 */

require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // Database Configuration
  database: {
    filename: process.env.DB_PATH || 'prompts.db',
    options: {
      verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined
    }
  },

  // Security Configuration
  security: {
    bcryptRounds: 10,
    rateLimit: {
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500 // Increased for dashboard with multiple simultaneous requests
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        skipSuccessfulRequests: true
      }
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://js.stripe.com",
            "https://www.paypal.com"
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: [
            "'self'",
            "https://api.stripe.com",
            "https://www.paypal.com"
          ],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: [
            "https://js.stripe.com",
            "https://www.paypal.com"
          ],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // Validation Configuration
  validation: {
    username: {
      minLength: 3,
      maxLength: 30
    },
    email: {
      maxLength: 100
    },
    password: {
      minLength: 8
    },
    promptText: {
      maxLength: 10000
    }
  },

  // reCAPTCHA Configuration
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    enabled: process.env.RECAPTCHA_ENABLED === 'true' || false,
    verifyUrl: 'https://www.google.com/recaptcha/api/siteverify'
  },

  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    // Use test mode if no secret key is provided or if explicitly set
    testMode: !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_MODE === 'true',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  },

  // PayPal Configuration
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    // Use sandbox mode if no client secret is provided or if explicitly set
    sandboxMode: !process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SANDBOX_MODE === 'true',
    environment: (!process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SANDBOX_MODE === 'true') 
      ? 'sandbox' 
      : 'live'
  }
};

/**
 * Validates required configuration values
 * @throws {Error} If critical configuration is missing
 */
function validateConfig() {
  if (!config.session.secret || config.session.secret === 'your-secret-key-change-in-production') {
    throw new Error(
      'CRITICAL ERROR: SESSION_SECRET must be set in .env file and cannot be the default value!\n' +
      'Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (config.isProduction && !config.session.cookie.secure) {
    console.warn('WARNING: Running in production without secure cookies. Ensure HTTPS is configured.');
  }
}

// Validate configuration on module load
validateConfig();

module.exports = config;
