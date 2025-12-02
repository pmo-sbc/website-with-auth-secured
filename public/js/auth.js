// Track previous auth state to detect changes
let previousAuthState = {
    isLoggedIn: false,
    userId: null
};

// Authentication Check
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navMenu = document.querySelector('.nav-menu');
    
    // If nav menu doesn't exist, try again later
    if (!navMenu) {
        console.warn('Navigation menu not found, will retry');
        setTimeout(checkAuth, 100);
        return;
    }

    // Check if auth state changed
    const currentUserId = user.id || user.userId || null;
    const isLoggedIn = !!(token && user.name);
    const authStateChanged = (
        previousAuthState.isLoggedIn !== isLoggedIn ||
        previousAuthState.userId !== currentUserId
    );

    if (authStateChanged && typeof window.switchCartOnAuthChange === 'function') {
        // Auth state changed, switch cart
        window.switchCartOnAuthChange();
        if (typeof window.updateCartCount === 'function') {
            window.updateCartCount();
        }
    }

    // Update previous auth state
    previousAuthState = {
        isLoggedIn,
        userId: currentUserId
    };

    if (token && user.name) {
        // User is logged in - show dashboard and logout with username and tokens
        const tokens = user.tokens !== undefined ? user.tokens : '...';
        
        // Always update the menu for logged-in users to ensure all links are present
        navMenu.innerHTML = `
            <li><a href="/">Home</a></li>
            <li><a href="/product">Product</a></li>
            <li><a href="/templates.html">Prompt Studio</a></li>
            <li><a href="/courses">Courses</a></li>
            <li><a href="/dashboard">My Vault</a></li>
            <li><a href="/profile">Profile</a></li>
            <li id="adminMenuLink" style="display: none;"><a href="/admin/users">User Management</a></li>
            <li id="adminProductsLink" style="display: none;"><a href="/admin/products">Product Management</a></li>
            <li style="color: #a1a1aa; display: flex; align-items: center; padding: 0 1rem;">Welcome, ${user.name} | 🪙 ${tokens} tokens</li>
            <li><a href="#" id="logoutBtn" class="btn-primary">Logout</a></li>
        `;

        // Show admin menu if user is admin
        if (user.is_admin) {
            const adminLink = document.getElementById('adminMenuLink');
            if (adminLink) {
                adminLink.style.display = 'list-item';
            }
            const adminProductsLink = document.getElementById('adminProductsLink');
            if (adminProductsLink) {
                adminProductsLink.style.display = 'list-item';
            }
        }

        // Add logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            // Remove any existing listeners by cloning
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            newLogoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }

        // Add cart link if cart.js is available
        addCartLinkToNav();
    } else {
        // User is not logged in - show login and signup
        // Always update the menu for non-logged-in users to ensure all links are present
        navMenu.innerHTML = `
            <li><a href="/">Home</a></li>
            <li><a href="/product">Product</a></li>
            <li><a href="/login">Login</a></li>
            <li><a href="/signup" class="btn-primary">Sign Up</a></li>
        `;
        
        // Add cart link if cart.js is available
        addCartLinkToNav();
    }
}

// Helper function to ensure Product link exists
function ensureProductLink() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;
    
    const productLink = navMenu.querySelector('a[href="/product"]');
    if (!productLink) {
        // Find Home link and insert Product after it
        const homeLink = navMenu.querySelector('a[href="/"]');
        if (homeLink && homeLink.parentElement) {
            const productLi = document.createElement('li');
            productLi.innerHTML = '<a href="/product">Product</a>';
            homeLink.parentElement.insertAdjacentElement('afterend', productLi);
        } else {
            // If no home link, prepend to nav menu
            const productLi = document.createElement('li');
            productLi.innerHTML = '<a href="/product">Product</a>';
            navMenu.insertBefore(productLi, navMenu.firstChild);
        }
    }
}

// Function to add cart link to navigation
function addCartLinkToNav() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    // Check if cart link already exists
    let cartLink = document.getElementById('cartLink');
    const count = (typeof getCartItemCount === 'function') ? getCartItemCount() : 0;
    
    if (!cartLink) {
        // Create cart link - always show it
        cartLink = document.createElement('li');
        cartLink.id = 'cartLink';
        cartLink.innerHTML = `<a href="/cart">Cart (<span id="cartCount">${count}</span>)</a>`;
        
        // Find a good position to insert (before logout/login or at end)
        const logoutBtn = navMenu.querySelector('#logoutBtn');
        const signupBtn = navMenu.querySelector('a[href="/signup"]');
        
        if (logoutBtn && logoutBtn.parentElement) {
            navMenu.insertBefore(cartLink, logoutBtn.parentElement);
        } else if (signupBtn && signupBtn.parentElement) {
            navMenu.insertBefore(cartLink, signupBtn.parentElement);
        } else {
            // Insert before last item (usually logout/signup)
            const lastItem = navMenu.lastElementChild;
            if (lastItem) {
                navMenu.insertBefore(cartLink, lastItem);
            } else {
                navMenu.appendChild(cartLink);
            }
        }
    } else {
        // Update existing cart count
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = count;
        }
    }
}

// Get CSRF token from cookie
function getCsrfToken() {
    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
}

async function logout() {
    try {
        const csrfToken = getCsrfToken();
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });

        // Dispatch logout event before clearing storage
        window.dispatchEvent(new CustomEvent('userLoggedOut'));

        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Logout failed:', response.status);
            // Redirect anyway
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        // Clear local storage and redirect anyway on error
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}

// Make checkAuth globally available
window.checkAuth = checkAuth;

// Run auth check on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        checkAuth();
    });
} else {
    checkAuth();
}

// Also check auth after session-manager has had time to update localStorage
setTimeout(function() {
    checkAuth();
    ensureProductLink();
}, 500);

// Check again after a longer delay to catch any late updates
setTimeout(function() {
    checkAuth();
    ensureProductLink();
}, 1000);

// Listen for cart updates to refresh navigation
window.addEventListener('cartUpdated', function() {
    addCartLinkToNav();
});

// Also update cart link after a short delay to ensure cart.js is loaded
setTimeout(function() {
    addCartLinkToNav();
}, 200);

// Watch for navigation changes and ensure Product link is always present
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            const productLink = navMenu.querySelector('a[href="/product"]');
            if (!productLink) {
                ensureProductLink();
            }
        }
    });
    
    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                observer.observe(navMenu, { childList: true, subtree: true });
            }
        });
    } else {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            observer.observe(navMenu, { childList: true, subtree: true });
        }
    }
}
