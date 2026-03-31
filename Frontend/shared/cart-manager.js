// Frontend/shared/cart-manager.js

/**
 * Standardized Cart Management using LocalStorage (NFR-5.2)
 * Supports multi-item purchase for FR-3.3
 */

const CART_KEY = 'ks_cart';

export function getCart() {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
}

export function addToCart(item) {
    const cart = getCart();
    
    // Check if item already in cart
    const existingIndex = cart.findIndex(i => i.id === item.id);
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1; // Basic increment for now
    } else {
        // Only store necessary data to keep size small
        cart.push({
            id: item.id,
            name: item.crop_name,
            variety: item.variety,
            price: item.price,
            unit: item.unit,
            farmer: item.farmer?.full_name || 'Verified Farmer',
            qty: 1 
        });
    }
    
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartIndicator();
}

export function removeFromCart(itemId) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== itemId);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartIndicator();
}

export function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartIndicator();
}

export function updateCartIndicator() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    
    // Update any UI count badges
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}
