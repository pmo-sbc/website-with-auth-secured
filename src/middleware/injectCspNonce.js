/**
 * CSP Nonce Injection Middleware
 * Injects CSP nonce into inline scripts in HTML files
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Inject CSP nonce into HTML content
 * @param {string} htmlContent - Original HTML content
 * @param {string} nonce - CSP nonce value
 * @returns {string} - HTML with nonce injected
 */
function injectNonceIntoHTML(htmlContent, nonce) {
  if (!nonce) {
    return htmlContent;
  }

  // Inject nonce into inline <script> tags (without src attribute)
  // Match all script tags, then filter out those with src
  const scriptTagRegex = /<script\s*([^>]*)>/gi;
  
  let modifiedHTML = htmlContent.replace(scriptTagRegex, (match, attributes) => {
    // Skip external scripts (those with src attribute)
    if (attributes && /src\s*=/i.test(attributes)) {
      return match;
    }
    
    // This is an inline script - add or update nonce
    const trimmedAttrs = attributes ? attributes.trim() : '';
    
    // Check if nonce already exists
    if (trimmedAttrs && /nonce\s*=/i.test(trimmedAttrs)) {
      // Replace existing nonce
      return match.replace(/nonce\s*=\s*["'][^"']*["']/i, `nonce="${nonce}"`);
    }
    
    // Add nonce attribute
    if (trimmedAttrs) {
      // Has other attributes, add nonce with space
      return `<script ${trimmedAttrs} nonce="${nonce}">`;
    }
    // No attributes, just add nonce
    return `<script nonce="${nonce}">`;
  });

  // Also inject into inline <style> tags if needed
  const styleTagRegex = /<style(?![^>]*\ssrc=)([^>]*)>/gi;
  modifiedHTML = modifiedHTML.replace(styleTagRegex, (match, attributes) => {
    if (attributes && attributes.includes('nonce=')) {
      return match.replace(/nonce="[^"]*"/, `nonce="${nonce}"`);
    }
    if (attributes && attributes.trim()) {
      return `<style${attributes} nonce="${nonce}">`;
    }
    return `<style nonce="${nonce}">`;
  });

  return modifiedHTML;
}

/**
 * Middleware to inject CSP nonce into HTML responses
 */
function injectCspNonceMiddleware(req, res, next) {
  const originalSendFile = res.sendFile;
  
  res.sendFile = function(filePath, options, callback) {
    // Handle callback as second parameter (Express.js pattern)
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    // Only process HTML files
    if (typeof filePath === 'string' && filePath.endsWith('.html')) {
      const nonce = res.locals.cspNonce;
      
      if (nonce) {
        try {
          // Determine the full path
          let fullPath;
          if (path.isAbsolute(filePath)) {
            fullPath = filePath;
          } else if (options && options.root) {
            // If root is provided in options, use it
            fullPath = path.join(options.root, filePath);
          } else {
            // Default to resolving from current working directory
            fullPath = path.resolve(filePath);
          }
          
          // Check if file exists
          if (!fs.existsSync(fullPath)) {
            logger.warn('HTML file not found for nonce injection', { 
              file: fullPath,
              originalPath: filePath,
              cwd: process.cwd()
            });
            return originalSendFile.call(this, filePath, options, callback);
          }
          
          // Read the HTML file
          let htmlContent = fs.readFileSync(fullPath, 'utf8');
          
          // Inject nonce into inline scripts
          htmlContent = injectNonceIntoHTML(htmlContent, nonce);
          
          // Log injection for debugging (remove in production)
          if (process.env.NODE_ENV !== 'production') {
            const scriptCount = (htmlContent.match(/<script(?![^>]*\ssrc\s*=)/gi) || []).length;
            logger.debug('CSP nonce injected', {
              file: path.basename(fullPath),
              nonce: nonce.substring(0, 8) + '...',
              scriptsFound: scriptCount
            });
          }
          
          // Send modified content
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(htmlContent);
        } catch (error) {
          logger.error('Error injecting CSP nonce into HTML', {
            file: filePath,
            error: error.message,
            stack: error.stack
          });
          // Fall back to original sendFile if injection fails
          return originalSendFile.call(this, filePath, options, callback);
        }
      } else {
        logger.warn('No CSP nonce available for HTML file', { file: filePath });
      }
    }
    
    // For non-HTML files, use original sendFile
    return originalSendFile.call(this, filePath, options, callback);
  };
  
  next();
}

module.exports = injectCspNonceMiddleware;

