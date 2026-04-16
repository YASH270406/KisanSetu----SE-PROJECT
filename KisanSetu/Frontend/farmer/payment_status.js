// Frontend/farmer/payment_status.js
import { supabase } from '../supabase-config.js';

let allPayments = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadPayments();
});

async function loadPayments() {
    const CACHE_KEY = 'ks_cache_payments';
    console.log("Loading payments for logged-in user...");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No user found, redirecting...");
            window.location.href = '../index.html';
            return;
        }

        // Fetch ledger entries where this farmer is the receiver
        // We select crop_name directly from ledger first (since we save it there now)
        const { data, error } = await supabase
            .from('transaction_ledger')
            .select('*')
            .eq('to_user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase ledger fetch error:", error);
            throw error;
        }

        console.log("Ledger data fetched:", data);

        // Save to cache on success
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));

        allPayments = data;
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


function renderPayments(transactions, isOffline = false) {
    const container = document.getElementById('payments-container');
    if (!container) return;
    container.innerHTML = '';

    if (isOffline) {
        const warning = document.createElement('div');
        warning.className = 'offline-badge sync-pulse';
        warning.style.width = '100%';
        warning.style.justifyContent = 'center';
        warning.style.marginBottom = '20px';
        warning.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Payments (Offline)';
        container.appendChild(warning);
    }

    if (!transactions || transactions.length === 0) {
        console.log("No transactions to display.");
        container.innerHTML = `
            <div style="text-align:center; padding: 50px 20px;">
                <i class="fa-solid fa-file-invoice-dollar" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <p>No completed or processing transactions found.</p>
                <small style="color: #888;">Payments appear here once a buyer completes a purchase.</small>
            </div>
        `;
        return;
    }

    transactions.forEach(txn => {
        const status = txn.status || 'Pending';
        const isSettled = status === 'Settled';
        const isTransit = status === 'InTransit';
        const isEscrow  = status === 'Escrow_Held';
        
        const cardClass = isSettled ? 'status-settled' : 'status-processing';
        
        let escrowText;
        if (isSettled) escrowText = '<i class="fa-solid fa-check-circle"></i> Funds Settled';
        else if (isTransit) escrowText = '<i class="fa-solid fa-truck-moving"></i> In Transit (Escrow)';
        else if (isEscrow)  escrowText = '<i class="fa-solid fa-lock"></i> Payment Held in Escrow';
        else escrowText = `<i class="fa-solid fa-clock"></i> ${status.replace('_', ' ')}`;
        
        const amount = parseFloat(txn.amount || 0);
        const crop = txn.crop_name || 'Agri-Product';
        const formattedDate = new Date(txn.created_at).toLocaleString();

        const card = document.createElement('div');
        card.className = `payment-card ${cardClass}`;
        card.style.borderLeft = isSettled ? '5px solid #2e7d32' : (isTransit || isEscrow) ? '5px solid #1565c0' : '5px solid #fbc02d';
        card.style.marginBottom = '20px';
        card.innerHTML = `
            <div class="flex-between">
                <div>
                    <strong>${crop} Sale</strong>
                    <div style="font-size: 0.8rem; color: #666;">Ref: ${(txn.id || '').substring(0,8)}...</div>
                </div>
                <div class="amount" style="color: #2e7d32; font-weight: bold; font-size: 1.2rem;">₹${amount.toLocaleString('en-IN')}</div>
            </div>
            <div class="flex-between" style="margin-top: 10px;">
                <span class="escrow-badge" style="background: #f5f5f5; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">${escrowText}</span>
                <span style="font-size: 0.75rem; color: #888;">${formattedDate}</span>
            </div>
            <button
                class="btn-download"
                data-invoice-id="${txn.id}"
                onclick="window.downloadInvoice('${txn.id}')"
                style="width:100%;margin-top:15px;padding:11px;background:#e8f5e9;color:#2e7d32;border:1px solid #c8e6c9;border-radius:8px;font-weight:700;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fa-solid fa-file-pdf"></i> Download Invoice (PDF)
            </button>
        `;
        container.appendChild(card);
    });
}

/**
 * Download a proper jsPDF farmer payment receipt.
 * All data is stored on the card element as data attributes set during render.
 */
window.downloadInvoice = function (txnId) {
    const txn = allPayments.find(t => t.id === txnId);
    if (!txn) {
        alert('Payment record not found.');
        return;
    }

    if (!window.KisanInvoice) {
        alert('PDF engine not loaded. Please check your internet connection and reload.');
        return;
    }

    const btn = document.querySelector(`[data-invoice-id="${txnId}"]`);
    const farmerName = document.querySelector('.greeting') 
        ? document.querySelector('.greeting').textContent.replace(/^Namaste,?\s*/i,'').trim() 
        : 'Farmer';

    KisanInvoice.download('farmer_payment', {
        txnId:      txn.id,
        cropName:   txn.crop_name   || 'Agri-Product',
        amount:     txn.amount      || 0,
        status:     txn.status      || 'Pending',
        created_at: txn.created_at  || new Date().toISOString(),
        farmerName: farmerName      || 'Registered Farmer',
        quantity:   txn.quantity    || '',
        unit:       txn.unit        || ''
    }, btn);
};
