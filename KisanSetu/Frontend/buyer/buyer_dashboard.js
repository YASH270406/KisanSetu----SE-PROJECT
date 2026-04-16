import { initializeDashboard } from '../shared/auth-helper.js';
import { initializeNotifications } from '../shared/notifications-manager.js';
import { getCart, clearCart } from '../shared/cart-manager.js';


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth and Profile
    await initializeDashboard('Buyer');
    await initializeNotifications();

    // 2. Render Cart Summary
    renderCartSummary();

    console.log("Buyer Dashboard Loaded with Cloud Sync.");
});

function renderCartSummary() {
    const cart = getCart();
    const section = document.getElementById('cart-summary-section');
    const container = document.getElementById('dashboard-cart-items');
    const totalEl = document.getElementById('dashboard-cart-total');

    if (!section || !container) return;

    if (cart.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const row = document.createElement('div');
        row.className = 'alert-item';
        row.style.borderLeftColor = 'var(--primary-green)';
        row.innerHTML = `
            <div class="alert-text" style="flex:1;">
                <h4>${item.name}</h4>
                <p>${item.qty} ${item.unit} &bull; ₹${item.price}/${item.unit}</p>
            </div>
            <div style="font-weight:700; color:var(--charcoal);">₹${itemTotal.toLocaleString('en-IN')}</div>
        `;
        container.appendChild(row);
    });

    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
}

window.clearUserCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
        clearCart();
        renderCartSummary();
    }
};

function toggleSyncStatus() {
    alert("KisanSetu is currently synced with the Supabase Cloud.");
}
window.toggleSyncStatus = toggleSyncStatus;

function activateSearch() {
    const query = prompt("Search Marketplace:\nTry: 'Onion in Nasik' or 'Organic Rice'");
    if (query) {
        window.location.href = `browse_produce.html?q=${encodeURIComponent(query)}`;
    }
}
window.activateSearch = activateSearch;
