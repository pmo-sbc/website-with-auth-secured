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
        max: 100
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
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
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
