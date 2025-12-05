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
    rolling: true, // Reset cookie maxAge on every response (inactivity timeout)
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 60 * 1000, // 30 minutes inactivity timeout
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
            (req, res) => {
              // Add nonce for inline scripts if available
              // Return undefined (not null) if nonce is not available
              const nonce = res.locals?.cspNonce;
              return nonce ? `'nonce-${nonce}'` : undefined;
            },
            "https://js.stripe.com",
            "https://www.paypal.com",
            "https://cdnjs.cloudflare.com", // For DOMPurify CDN
            "'unsafe-inline'" // Temporarily needed until all inline scripts have nonces injected
            // The injectCspNonce middleware will add nonces, but keeping this as fallback
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
      },
      // Permissions Policy (replaces Feature-Policy)
      permissionsPolicy: {
        geolocation: [], // Disable geolocation
        microphone: [], // Disable microphone
        camera: [], // Disable camera
        payment: ["'self'"], // Allow payment API only from same origin
        usb: [], // Disable USB
        magnetometer: [], // Disable magnetometer
        gyroscope: [], // Disable gyroscope
        accelerometer: [], // Disable accelerometer
        ambientLightSensor: [], // Disable ambient light sensor
        autoplay: ["'self'"], // Allow autoplay only from same origin
        encryptedMedia: ["'self'"], // Allow encrypted media only from same origin
        fullscreen: ["'self'"], // Allow fullscreen only from same origin
        pictureInPicture: ["'self'"] // Allow picture-in-picture only from same origin
      },
      // Expect-CT header (Certificate Transparency)
      expectCt: {
        maxAge: 86400, // 24 hours
        enforce: true, // Enforce CT compliance
        reportUri: undefined // Optional: Add reporting endpoint if needed
      },
      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: true,
      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: {
        policy: "same-origin" // Restrict to same-origin only
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
