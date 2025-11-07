// Authentication Check
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navMenu = document.querySelector('.nav-menu');

    if (token && user.name) {
        // User is logged in - show dashboard and logout with username and tokens
        const tokens = user.tokens !== undefined ? user.tokens : '...';
        navMenu.innerHTML = `
            <li><a href="/">Home</a></li>
            <li><a href="/templates.html">Prompt Studio</a></li>
            <li><a href="/dashboard">My Vault</a></li>
            <li id="adminMenuLink" style="display: none;"><a href="/admin/users">User Management</a></li>
            <li style="color: #a1a1aa; display: flex; align-items: center; padding: 0 1rem;">Welcome, ${user.name} | 🪙 ${tokens} tokens</li>
            <li><a href="#" id="logoutBtn" class="btn-primary">Logout</a></li>
        `;

        // Show admin menu if user is admin
        if (user.is_admin) {
            document.getElementById('adminMenuLink').style.display = 'list-item';
        }

        // Add logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    } else {
        // User is not logged in - show login and signup only
        navMenu.innerHTML = `
            <li><a href="/">Home</a></li>
            <li><a href="/login">Login</a></li>
            <li><a href="/signup" class="btn-primary">Sign Up</a></li>
        `;
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
        // Clear local storage and redirect anyway on error
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}

// Run auth check on page load
checkAuth();
