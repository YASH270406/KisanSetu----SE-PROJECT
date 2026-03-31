// Frontend/farmer/payment_status.js
import { supabase } from '../supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadPayments();
});

async function loadPayments() {
    const CACHE_KEY = 'ks_cache_payments';
    let isOffline = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        // Fetch orders where this farmer is the seller
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                produce:produce_id (crop_name)
            `)
            .eq('farmer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Save to cache on success
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));

        renderPayments(data, false);
    } catch (err) {
        console.warn("Network error or payments fetch failed. Loading from cache...", err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            renderPayments(parsed.data, true);
        } else {
            renderPayments([], false);
        }
    }
}


function renderPayments(orders, isOffline = false) {
    const container = document.getElementById('payments-container');
    container.innerHTML = '';

    // Add Offline Indicator if needed
    if (isOffline) {
        const warning = document.createElement('div');
        warning.className = 'offline-badge sync-pulse';
        warning.style.width = '100%';
        warning.style.justifyContent = 'center';
        warning.style.marginBottom = '20px';
        warning.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Payments (Offline)';
        container.appendChild(warning);
    }

    if (orders.length === 0) {

        container.innerHTML = `
            <div style="text-align:center; padding: 50px 20px;">
                <i class="fa-solid fa-file-invoice-dollar" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <p>No completed or processing transactions found.</p>
                <small style="color: #888;">Payments appear here once a buyer completes a purchase.</small>
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        const isSettled = order.status === 'Settled';
        const cardClass = isSettled ? 'status-settled' : 'status-processing';
        const escrowText = isSettled ? '<i class="fa-solid fa-check-circle"></i> Funds Settled' : '<i class="fa-solid fa-clock"></i> Escrow Processing';
        const formattedDate = new Date(order.created_at).toLocaleString();

        const card = document.createElement('div');
        card.className = `payment-card glass-card \${cardClass}`;
        card.style.borderLeft = isSettled ? '5px solid #2e7d32' : '5px solid #fbc02d';
        card.style.marginBottom = '20px';
        card.innerHTML = `
            <div class="flex-between">
                <div>
                    <strong>\${order.produce?.crop_name || 'Produce'} Sale</strong>
                    <div style="font-size: 0.8rem; color: #666;">Order: \${order.id.substring(0,8)}...</div>
                </div>
                <div class="amount" style="color: #2e7d32; font-weight: bold; font-size: 1.2rem;">₹\${order.total_amount.toLocaleString('en-IN')}</div>
            </div>
            <div class="flex-between" style="margin-top: 10px;">
                <span class="escrow-badge" style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">\${escrowText}</span>
                <span style="font-size: 0.75rem; color: #888;">\${formattedDate}</span>
            </div>
            <button class="btn-download" onclick="window.downloadInvoice('\${order.id}')" style="width: 100%; margin-top: 15px; padding: 10px; background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; border-radius: 8px; font-weight: bold; cursor: pointer;">
                <i class="fa-solid fa-file-invoice"></i> Download Invoice
            </button>
        `;
        container.appendChild(card);
    });
}

function downloadInvoice(orderId) {
    alert(`Generating PDF Invoice for order ${orderId.substring(0, 8)}...`);
}
window.downloadInvoice = downloadInvoice;
