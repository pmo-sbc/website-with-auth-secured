/**
 * Shopping Cart Management
 * Handles cart operations using localStorage
 */

// Cart storage key
const CART_STORAGE_KEY = 'shopping_cart';

/**
 * Get cart from localStorage
 */
function getCart() {
    try {
        const cartJson = localStorage.getItem(CART_STORAGE_KEY);
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (error) {
        console.error('Error reading cart from localStorage:', error);
        return [];
    }
}

/**
 * Save cart to localStorage
 */
function saveCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        return true;
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
        return false;
    }
}

/**
 * Add item to cart
 */
function addItemToCart(item) {
    const cart = getCart();
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
        // Update quantity if item exists
        cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
    } else {
        // Add new item
        cart.push({
            ...item,
            quantity: item.quantity || 1
        });
    }
    
    saveCart(cart);
    updateCartCount();
    return cart;
}

/**
 * Remove item from cart
 */
function removeItemFromCart(itemId) {
    const cart = getCart();
    const filteredCart = cart.filter(item => item.id !== itemId);
    saveCart(filteredCart);
    updateCartCount();
    return filteredCart;
}

/**
 * Update item quantity in cart
 */
function updateItemQuantity(itemId, quantity) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            return removeItemFromCart(itemId);
        } else {
            cart[itemIndex].quantity = quantity;
            saveCart(cart);
            updateCartCount();
        }
    }
    
    return cart;
}

/**
 * Clear entire cart
 */
function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateCartCount();
    return [];
}

/**
 * Get total number of items in cart
 */
function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
}

/**
 * Get cart total price
 */
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const itemPrice = item.finalPrice !== undefined ? item.finalPrice : item.price;
        return total + (itemPrice * (item.quantity || 1));
    }, 0);
}

/**
 * Get cart subtotal (before discounts)
 */
function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        return total + (item.price * (item.quantity || 1));
    }, 0);
}

/**
 * Get total discount amount
 */
function getCartDiscount() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        if (item.discountApplied && item.finalPrice !== undefined) {
            const discount = (item.price * (item.quantity || 1)) - (item.finalPrice * (item.quantity || 1));
            return total + discount;
        }
        return total;
    }, 0);
}

/**
 * Update cart count in navigation
 */
function updateCartCount() {
    const count = getCartItemCount();
    const cartLink = document.getElementById('cartLink');
    const cartCount = document.getElementById('cartCount');
    
    if (cartLink && cartCount) {
        if (count > 0) {
            cartLink.style.display = 'list-item';
            cartCount.textContent = count;
        } else {
            cartLink.style.display = 'none';
        }
    }
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { count, cart: getCart() } 
    }));
}

// Initialize cart count on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', updateCartCount);
    updateCartCount();
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCart,
        saveCart,
        addItemToCart,
        removeItemFromCart,
        updateItemQuantity,
        clearCart,
        getCartItemCount,
        getCartTotal,
        getCartSubtotal,
        getCartDiscount,
        updateCartCount
    };
}

