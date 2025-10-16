/**
 * Session Manager
 * Handles session state and expiration detection across all pages
 */

class SessionManager {
  constructor() {
    this.checkInterval = null;
    this.warningShown = false;
    this.CHECK_INTERVAL_MS = 60000; // Check every minute
    this.WARNING_THRESHOLD_MS = 5 * 60 * 1000; // Warn 5 minutes before expiration
  }

  /**
   * Initialize session monitoring
   */
  async init() {
    // Check session status immediately
    await this.checkSession();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Check current session status
   */
  async checkSession() {
    try {
      const response = await fetch('/api/session/status', {
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.authenticated) {
        this.handleSessionExpired();
        return false;
      }

      // Update localStorage with user data
      const user = {
        name: data.username,
        userId: data.userId,
        is_admin: data.is_admin || false
      };
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', 'session'); // Flag that we have a session

      // Check if session is about to expire
      if (data.expiresIn && data.expiresIn < this.WARNING_THRESHOLD_MS && !this.warningShown) {
        this.showExpirationWarning(data.expiresIn);
      }

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      return false;
    }
  }

  /**
   * Handle expired session
   */
  handleSessionExpired() {
    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Stop checking
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Only redirect if we're on a protected page
    const protectedPages = ['/dashboard', '/admin', '/templates'];
    const currentPath = window.location.pathname;

    const isProtected = protectedPages.some(page => currentPath.includes(page));

    if (isProtected) {
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
    } else {
      // Just update the UI on public pages
      if (window.checkAuth) {
        window.checkAuth();
      }
    }
  }

  /**
   * Show warning when session is about to expire
   */
  showExpirationWarning(expiresInMs) {
    this.warningShown = true;
    const minutes = Math.floor(expiresInMs / 60000);

    const warning = document.createElement('div');
    warning.id = 'session-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 300px;
    `;
    warning.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">⏰</span>
        <div>
          <strong>Session Expiring Soon</strong>
          <p style="margin: 5px 0 0 0; font-size: 0.9rem;">
            Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}.
            Click anywhere to stay logged in.
          </p>
        </div>
        <button onclick="document.getElementById('session-warning').remove()"
                style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">
          ×
        </button>
      </div>
    `;

    document.body.appendChild(warning);

    // Remove warning after 10 seconds
    setTimeout(() => {
      const el = document.getElementById('session-warning');
      if (el) el.remove();
    }, 10000);
  }

  /**
   * Refresh session by making any API call
   */
  async refreshSession() {
    try {
      await this.checkSession();
      this.warningShown = false;
      const warning = document.getElementById('session-warning');
      if (warning) warning.remove();
    } catch (error) {
      console.error('Session refresh failed:', error);
    }
  }

  /**
   * Stop session monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated() {
    return await this.checkSession();
  }
}

// Create global session manager instance
window.sessionManager = new SessionManager();

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager.init();
  });
} else {
  window.sessionManager.init();
}

// Refresh session on user activity
let activityTimeout;
['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
  document.addEventListener(event, () => {
    clearTimeout(activityTimeout);
    activityTimeout = setTimeout(() => {
      if (window.sessionManager) {
        window.sessionManager.refreshSession();
      }
    }, 1000); // Debounce activity refresh
  });
});
