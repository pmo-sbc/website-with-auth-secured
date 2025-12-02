/**
 * Email Service - Zapier Integration
 * Sends emails via Zapier webhook while maintaining existing email templates
 */

const axios = require('axios');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    this.zapierSecret = process.env.ZAPIER_SECRET; // Optional security
    this.from = process.env.EMAIL_FROM || 'AI Prompt Templates <noreply@example.com>';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    if (!this.zapierWebhookUrl) {
      logger.warn('Zapier webhook URL not configured. Emails will be logged instead of sent.');
    } else {
      logger.info('Zapier email service initialized', {
        webhookConfigured: true
      });
    }
  }

  /**
   * Send email via Zapier webhook
   */
  async sendEmail(to, subject, html) {
    if (!this.zapierWebhookUrl) {
      // Log email instead of sending
      logger.info('EMAIL (not sent - no webhook configured)', {
        to,
        subject,
        html: html.substring(0, 200) + '...'
      });
      return { success: true, message: 'Email logged (development mode)' };
    }

    try {
      // Prepare payload for Zapier
      const payload = {
        to_email: to,
        from_email: this.from,
        subject: subject,
        html_body: html,
        timestamp: new Date().toISOString()
      };

      // Add secret if configured (for webhook security)
      if (this.zapierSecret) {
        payload.secret = this.zapierSecret;
      }

      // Send to Zapier webhook
      const response = await axios.post(this.zapierWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      logger.info('Email sent via Zapier successfully', {
        to,
        subject,
        status: response.status,
        zapierResponse: response.data
      });

      return {
        success: true,
        messageId: response.data?.id || `zapier-${Date.now()}`,
        zapierStatus: response.data?.status
      };
    } catch (error) {
      logger.error('Failed to send email via Zapier', {
        error: error.message,
        to,
        subject,
        webhookUrl: this.zapierWebhookUrl,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });

      // Don't throw - log and continue so app doesn't break
      // In production, you might want to queue failed emails for retry
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email verification email
   * (Keeps exact same format as before)
   */
  async sendVerificationEmail(email, username, verificationToken) {
    const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;

    const subject = 'Verify Your Email - AI Prompt Templates';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #667eea;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #667eea;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffecb5;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI</div>
            <h1>Welcome to AI Prompt Templates!</h1>
          </div>

          <p>Hi ${username},</p>

          <p>Thank you for creating an account with AI Prompt Templates. To get started, please verify your email address by clicking the button below:</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>

          <div class="warning">
            <strong>Note:</strong> This verification link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
          </div>

          <p>Once verified, you'll have full access to:</p>
          <ul>
            <li>49+ professional prompt blueprints</li>
            <li>Save and manage your favorite templates</li>
            <li>Track your prompt usage</li>
            <li>Generate AI-ready prompts instantly</li>
          </ul>

          <p>Happy prompting!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send welcome email after verification
   * (Keeps exact same format as before)
   */
  async sendWelcomeEmail(email, username) {
    const subject = 'Welcome to AI Prompt Templates! 🎉';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #667eea;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #667eea;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .feature-box {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI</div>
            <h1>You're All Set, ${username}! 🎉</h1>
          </div>

          <p>Your email has been verified and your account is now fully activated!</p>

          <div style="text-align: center;">
            <a href="${this.baseUrl}/templates" class="button">Start Creating Prompts</a>
          </div>

          <h2>Quick Start Guide:</h2>

          <div class="feature-box">
            <strong>1. Explore the Prompt Studio</strong><br>
            Browse 49+ professional blueprints across Marketing, Development, Content Writing, Business, and Education.
          </div>

          <div class="feature-box">
            <strong>2. Customize Your Prompts</strong><br>
            Select a blueprint, fill in your parameters, and adjust the tone and style to match your needs.
          </div>

          <div class="feature-box">
            <strong>3. Generate & Use</strong><br>
            Generate your prompt and send it directly to ChatGPT, Claude, Gemini, or any AI platform.
          </div>

          <div class="feature-box">
            <strong>4. Save Favorites</strong><br>
            Bookmark templates you use frequently for quick access later.
          </div>

          <p>Need help? Have questions? Just reply to this email - we're here to help!</p>

          <p>Happy prompting!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
            <p><a href="${this.baseUrl}" style="color: #667eea;">Visit Dashboard</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send password reset email
   * (Keeps exact same format as before)
   */
  async sendPasswordResetEmail(email, username, resetToken) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request - AI Prompt Templates';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #e74c3c;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #e74c3c;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #e74c3c;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffecb5;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔒</div>
            <h1>Password Reset Request</h1>
          </div>

          <p>Hi ${username},</p>

          <p>We received a request to reset your password for your AI Prompt Templates account. Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #e74c3c;">${resetUrl}</p>

          <div class="warning">
            <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </div>

          <p>For security reasons, we recommend choosing a strong password that:</p>
          <ul>
            <li>Is at least 8 characters long</li>
            <li>Contains uppercase and lowercase letters</li>
            <li>Includes at least one number</li>
            <li>Is unique to this account</li>
          </ul>

          <p>Stay safe!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(email, customerName, orderData) {
    const subject = 'Order Confirmation - AI Prompt Templates';

    // Format order items
    const orderItemsHtml = orderData.items.map(item => {
      const itemTotal = (item.finalPrice !== undefined ? item.finalPrice : item.price) * (item.quantity || 1);
      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 15px; text-align: left;">
            <strong>${item.name}</strong><br>
            <span style="color: #666; font-size: 0.9em;">Quantity: ${item.quantity || 1} × ${this.formatCurrency(item.price)}</span>
          </td>
          <td style="padding: 15px; text-align: right; font-weight: 600;">
            ${this.formatCurrency(itemTotal)}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #2ecc71;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #2ecc71;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #2ecc71;
            margin: 10px 0;
          }
          .success-badge {
            background: #e8f5e9;
            border: 1px solid #c8e6c9;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            color: #2e7d32;
            font-weight: 600;
          }
          .order-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
          }
          .order-table th {
            background: #f5f5f5;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e0e0e0;
          }
          .order-summary {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .summary-row.total {
            font-size: 1.3em;
            font-weight: 700;
            color: #2ecc71;
            border-top: 2px solid #2ecc71;
            margin-top: 10px;
            padding-top: 15px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✓</div>
            <h1>Order Confirmation</h1>
          </div>

          <p>Hi ${customerName},</p>

          <div class="success-badge">
            🎉 Your payment was successful! Thank you for your purchase.
          </div>

          <p>We're excited to confirm your order. Here's what you've purchased:</p>

          <table class="order-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${orderItemsHtml}
            </tbody>
          </table>

          <div class="order-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(orderData.subtotal || 0)}</span>
            </div>
            ${orderData.discount && orderData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span>-${this.formatCurrency(orderData.discount)}</span>
            </div>
            ` : ''}
            <div class="summary-row total">
              <span>Total Paid:</span>
              <span>${this.formatCurrency(orderData.total || 0)}</span>
            </div>
          </div>

          <p><strong>What's Next?</strong></p>
          <p>Your order is being processed and you'll receive your product details shortly. If you have any questions about your order, please don't hesitate to contact us.</p>

          <p>Thank you for choosing AI Prompt Templates!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

module.exports = new EmailService();
