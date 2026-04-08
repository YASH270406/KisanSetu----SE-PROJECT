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
        // If already in cart, increment quantity
        cart[existingIndex].qty += (item.qty || 1);
        if (item.batch_count) {
            cart[existingIndex].batch_count = (cart[existingIndex].batch_count || 1) + item.batch_count;
        }
    } else {
        // CRITICAL FIX: Store the farmer_id so the ledger and notification can reach them
        cart.push({
            id: item.id,
            name: item.crop_name || item.name,
            variety: item.variety || '',
            price: item.price,
            unit: item.unit,
            farmer_id: item.farmer_id || (item.farmer && item.farmer.id) || null,
            farmer_name: item.farmer?.full_name || 'Verified Farmer',
            qty: item.qty || 1,
            batch_count: item.batch_count || 1,
            bid_id: item.bid_id || null
        });
    }
    
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartIndicator();
}

/**
 * Explicitly sets the quantity for an item (Overwrite mode)
 * Matches FR-3.3 for precise batch selection
 */
export function updateCartQty(itemId, newQty, newBatchCount) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === itemId);
    
    if (idx > -1) {
        cart[idx].qty = newQty;
        if (newBatchCount !== undefined) {
            cart[idx].batch_count = newBatchCount;
        }
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartIndicator();
    }
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
    // Use batch_count instead of qty-value for the badge (FR-3.3 consistency)
    const count = cart.reduce((sum, item) => sum + (item.batch_count || 1), 0);
    
    // Update any UI count badges
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}
