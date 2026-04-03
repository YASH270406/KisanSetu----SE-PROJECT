// KisanSetu | Track Orders — Supabase Live Data
// SRS FR-3.3, FR-3.4, FR-7.2
import { supabase } from '../supabase-config.js';

// ── Order lifecycle stages shown in the stepper ───────────────────────────
const STAGES = [
    { key: 'Placed',    label: 'Order\nPlaced',    icon: 'fa-bag-shopping' },
    { key: 'Confirmed', label: 'Confirmed',         icon: 'fa-circle-check' },
    { key: 'InTransit', label: 'In\nTransit',       icon: 'fa-truck-moving' },
    { key: 'Delivered', label: 'Delivered',          icon: 'fa-box-open' },
    { key: 'Settled',   label: 'Payment\nReleased', icon: 'fa-indian-rupee-sign' },
];

let currentTab = 'active';
let currentBuyerId = null;
let allOrders = [];

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '../index.html'; return; }

    currentBuyerId = user.id;
    await loadOrders();
    setupRealtime();
});

// Auto-refresh on tab focus
window.addEventListener('focus', () => loadOrders());

// ── Realtime subscription ─────────────────────────────────────────────────
function setupRealtime() {
    supabase
        .channel('buyer-orders-watch')
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'transaction_ledger'
        }, () => loadOrders())
        .subscribe();

    // Polling fallback
    setInterval(loadOrders, 20000);
}

// ── Tab Switching ─────────────────────────────────────────────────────────
window.switchTab = (tab) => {
    currentTab = tab;
    document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('active'));
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add('active');
    renderOrders(allOrders);
};

// ── Load from Supabase ────────────────────────────────────────────────────
async function loadOrders() {
    if (!currentBuyerId) return;

    try {
        // Join: transaction_ledger → produce → users (farmer)
        const { data, error } = await supabase
            .from('transaction_ledger')
            .select(`
                id,
                amount,
                status,
                created_at,
                batch_count,
                crop_name,
                quantity,
                unit,
                notes,
                reference_type,
                produce:produce_id (
                    id,
                    crop_name,
                    variety,
                    quantity,
                    unit,
                    price,
                    batch_size,
                    total_batches,
                    images,
                    farmer:farmer_id (
                        full_name,
                        mobile_num
                    )
                ),
                bid:bid_id (
                    batch_count,
                    bid_price
                )
            `)
            .eq('from_user_id', currentBuyerId)
            .eq('reference_type', 'Produce_Sale')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allOrders = data || [];
        updateBadge(allOrders);
        renderOrders(allOrders);

    } catch (err) {
        console.error('Track Orders fetch error:', err);
        // Show friendly error
        const list = document.getElementById('orders-list');
        if (list) {
            list.innerHTML = `
                <div style="background:white; border-radius:14px; padding:30px; box-shadow:0 4px 16px rgba(0,0,0,0.06); text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem; color:#fbc02d; margin-bottom:16px; display:block;"></i>
                    <h3 style="font-size:1rem; margin-bottom:8px; color:#37474f;">Could not load orders</h3>
                    <p style="color:#888; font-size:0.85rem; margin-bottom:16px;">${err.message || 'Network error'}</p>
                    <button onclick="loadOrders()" style="background:#2e7d32;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-family:Poppins,sans-serif;font-weight:600;">
                        <i class="fa-solid fa-rotate"></i> Retry
                    </button>
                </div>`;
        }
    }
}

// ── Badge ─────────────────────────────────────────────────────────────────
function updateBadge(orders) {
    const badge = document.getElementById('order-badge');
    if (!badge) return;
    const active = orders.filter(o => ['Pending_Payment', 'Escrow_Held', 'InTransit', 'Delivered'].includes(o.status)).length;
    badge.textContent = active;
    badge.style.display = active > 0 ? 'inline-block' : 'none';
}

// ── Render ────────────────────────────────────────────────────────────────
function renderOrders(orders) {
    const list  = document.getElementById('orders-list');
    const empty = document.getElementById('empty-msg');
    if (!list) return;
    list.innerHTML = '';

    const activeStatuses = ['Pending_Payment', 'Escrow_Held', 'InTransit', 'Delivered'];
    const pastStatuses   = ['Settled', 'Refunded'];

    const filtered = currentTab === 'active'
        ? orders.filter(o => activeStatuses.includes(o.status))
        : orders.filter(o => pastStatuses.includes(o.status));

    const emptyTitle = document.getElementById('empty-title');
    const emptySub   = document.getElementById('empty-sub');
    if (filtered.length === 0) {
        if (empty) {
            empty.style.display = 'block';
            if (emptyTitle) emptyTitle.textContent = currentTab === 'active' ? 'No active deliveries' : 'No past orders yet';
            if (emptySub)   emptySub.textContent   = currentTab === 'active'
                ? 'When a deal is accepted and you pay at checkout, orders will appear here.'
                : 'Completed orders will show here after you confirm delivery.';
        }
        return;
    }
    if (empty) empty.style.display = 'none';

    filtered.forEach(order => list.appendChild(buildOrderCard(order)));
}

// ── Map status → stepper index ────────────────────────────────────────────
function getStageIndex(status) {
    switch (status) {
        case 'Pending_Payment': return 0; // Order Placed
        case 'Escrow_Held':     return 1; // Confirmed / Paid
        case 'InTransit':       return 2; // In Transit (Dispatched)
        case 'Delivered':       return 3; // Delivered
        case 'Settled':         return 4; // Fully settled
        case 'Refunded':        return -1; // Cancelled
        default:                return 0;
    }
}

// ── Build Order Card ──────────────────────────────────────────────────────
function buildOrderCard(order) {
    const produce     = order.produce;
    const farmer      = produce?.farmer;
    const bid         = order.bid;

    // Prefer stored denormalized data, fall back to joined produce
    const cropName    = order.crop_name     || produce?.crop_name     || 'Produce';
    const variety     = produce?.variety    || '';
    const unit        = order.unit          || produce?.unit          || '';
    const batchCount  = bid?.batch_count    || order.batch_count      || 1;
    const batchSize   = produce?.batch_size || 1;
    const totalQty    = batchCount * batchSize;
    const dealPrice   = bid?.bid_price      || order.amount / (totalQty || 1);
    const amount      = Number(order.amount || 0);
    const farmerName  = farmer?.full_name   || 'Verified Farmer';

    const stageIdx    = getStageIndex(order.status);
    const isCancelled = order.status === 'Refunded';
    const isSettled   = order.status === 'Settled';
    const isActive    = order.status === 'Escrow_Held';

    const orderDate   = new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    const shortId = order.id.substring(0, 8).toUpperCase();

    // Status pill
    let pillBg, pillColor, pillText;
    if (order.status === 'Pending_Payment') { pillBg = '#f5f5f5'; pillColor = '#666';    pillText = '🕒 Awaiting Payment'; }
    else if (isActive)    { pillBg = '#fff3e0'; pillColor = '#e65100'; pillText = '🔒 Escrow Held'; }
    else if (order.status === 'InTransit') { pillBg = '#e3f2fd'; pillColor = '#1565c0'; pillText = '🚚 In Transit'; }
    else if (order.status === 'Delivered') { pillBg = '#f1f8e9'; pillColor = '#2e7d32'; pillText = '📦 Delivered'; }
    else if (isSettled)   { pillBg = '#e8f5e9'; pillColor = '#2e7d32'; pillText = '✅ Settled';      }
    else if (isCancelled) { pillBg = '#ffebee'; pillColor = '#c62828'; pillText = '↩️ Refunded';     }
    else                  { pillBg = '#f5f5f5'; pillColor = '#666';    pillText = order.status;      }

    // Card border class
    let cardClass = 'order-card';
    if (isSettled)   cardClass += ' settled';
    if (isCancelled) cardClass += ' refunded';
    if (isActive)    cardClass += ' pending';

    // Build timeline HTML
    let timelineHTML = '';
    if (isCancelled) {
        timelineHTML = `
            <div class="refund-banner">
                <i class="fa-solid fa-ban"></i>
                Order Cancelled — Funds have been refunded to your account.
            </div>`;
    } else {
        // Calculate progress line width
        const pct = stageIdx >= 0 ? Math.round((stageIdx / (STAGES.length - 1)) * 100) : 0;

        timelineHTML = `
            <div class="timeline">
                <div class="tl-progress-line" style="width:${Math.min(pct, 85)}%;"></div>
                ${STAGES.map((s, i) => {
                    let stepClass = 'tl-step';
                    if (i < stageIdx)  stepClass += ' done';
                    else if (i === stageIdx) stepClass += ' active';
                    const icon = i < stageIdx ? 'fa-check' : s.icon;
                    return `
                        <div class="${stepClass}">
                            <div class="tl-dot"><i class="fa-solid ${icon}"></i></div>
                            <div class="tl-label">${s.label.replace('\n', '<br>')}</div>
                        </div>`;
                }).join('')}
            </div>`;
    }

    // Settled badge for history
    const settledBadge = isSettled
        ? `<div class="settled-badge"><i class="fa-solid fa-circle-check"></i> Payment successfully released to ${farmerName}</div>`
        : '';

    const card = document.createElement('div');
    card.className = cardClass;
    card.id = `order-${order.id}`;

    card.innerHTML = `
        <!-- Top Bar -->
        <div class="card-topbar">
            <div class="order-id">
                <i class="fa-solid fa-hashtag"></i> TXN-${shortId} &bull; ${orderDate}
            </div>
            <span class="status-pill" style="background:${pillBg}; color:${pillColor};">${pillText}</span>
        </div>

        <!-- Body -->
        <div class="card-body">
            <div class="crop-title">${cropName} ${variety ? `<span style="font-weight:400;color:#999;">(${variety})</span>` : ''}</div>
            <div class="crop-meta">
                <span><i class="fa-solid fa-user" style="color:#2e7d32;"></i> ${farmerName}</span>
                <span><i class="fa-solid fa-boxes-stacked" style="color:#1565c0;"></i> ${batchCount} batch${batchCount > 1 ? 'es' : ''}</span>
                <span><i class="fa-solid fa-scale-balanced" style="color:#f57c00;"></i> ${totalQty} ${unit}</span>
            </div>

            <!-- Stats Row -->
            <div class="order-stats">
                <div class="stat-box">
                    <div class="stat-label">Deal Price</div>
                    <div class="stat-val">₹${dealPrice.toFixed(0)}</div>
                    <div class="stat-unit">per ${unit}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Batches</div>
                    <div class="stat-val blue">${batchCount}</div>
                    <div class="stat-unit">${batchSize} ${unit}/batch</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Total Paid</div>
                    <div class="stat-val">₹${amount.toLocaleString('en-IN')}</div>
                    <div class="stat-unit">in escrow</div>
                </div>
            </div>

            <!-- Timeline -->
            ${timelineHTML}

            <!-- Settled Badge -->
            ${settledBadge}
        </div>

        <!-- Actions -->
        <div class="card-actions">
            ${isActive ? `
                <button class="btn-confirm" onclick="window.confirmReceipt('${order.id}')">
                    <i class="fa-solid fa-handshake"></i> Confirm Receipt & Release Payment
                </button>
            ` : ''}
            ${isActive ? `
                <button class="btn-issue" onclick="window.raiseIssue('${order.id}', 'TXN-${shortId}')">
                    <i class="fa-solid fa-flag"></i> Issue
                </button>
            ` : ''}
            <button class="btn-invoice" onclick="window.downloadInvoice('${order.id}', '${cropName}', '${totalQty} ${unit}', ${amount}, '${orderDate}', '${farmerName}', ${batchCount})">
                <i class="fa-solid fa-file-invoice"></i> Invoice
            </button>
        </div>
    `;

    return card;
}

// ── Confirm Receipt (Release Escrow) ──────────────────────────────────────
window.confirmReceipt = async (orderId) => {
    if (!confirm('Confirming receipt will release escrow funds to the farmer. This cannot be undone. Proceed?')) return;

    const { error } = await supabase
        .from('transaction_ledger')
        .update({ status: 'Settled' })
        .eq('id', orderId)
        .eq('from_user_id', currentBuyerId);

    if (error) {
        alert('Failed to release funds: ' + error.message);
        return;
    }

    // Show success toast
    showToast('✅ Payment released! Escrow settled successfully.');
    await loadOrders();
};

// ── Issue Modal ───────────────────────────────────────────────────────────
window.raiseIssue = (orderId, shortId) => {
    document.getElementById('issue-order-id').textContent = shortId;
    document.getElementById('issue-modal').style.display  = 'flex';
    document.getElementById('issue-modal').dataset.orderId = orderId;
};

window.closeIssueModal = () => {
    document.getElementById('issue-modal').style.display = 'none';
    document.getElementById('issue-desc').value = '';
};

window.submitIssue = () => {
    const desc = document.getElementById('issue-desc').value.trim();
    if (!desc) { alert('Please describe the issue.'); return; }
    // In production: insert to an issues/support table
    alert('✅ Issue submitted! Our support team will review and respond within 24 hours.');
    window.closeIssueModal();
};

// ── Download Invoice ──────────────────────────────────────────────────────
window.downloadInvoice = (txnId, cropName, qty, amount, date, farmerName, batchCount) => {
    const shortId = txnId.substring(0, 8).toUpperCase();
    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>KisanSetu Invoice - TXN-${shortId}</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f5f7fa; padding: 40px 20px; color: #333; }
        .invoice-box { max-width: 820px; margin: auto; padding: 45px; border: 1px solid #dde3ec; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,0.08); border-radius: 14px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2e7d32; padding-bottom: 28px; margin-bottom: 30px; }
        .logo-block { display: flex; align-items: center; gap: 14px; }
        .logo-icon { width: 48px; height: 48px; background: #2e7d32; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .logo-icon svg { fill: white; width: 28px; }
        .logo-text h1 { color: #2e7d32; margin: 0; font-size: 1.8rem; }
        .logo-text p { color: #888; font-size: 0.8rem; margin: 0; }
        .invoice-meta { text-align: right; }
        .invoice-meta h2 { color: #2e7d32; letter-spacing: 3px; font-size: 1.3rem; margin: 0; }
        .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f1f8e9; color: #2e7d32; padding: 14px 16px; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
        td { padding: 16px; border-bottom: 1px solid #f0f0f0; }
        .total-row td { font-size: 1.1rem; font-weight: 700; color: #1b5e20; background: #f1f8e9; border-top: 2px solid #2e7d32; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.82rem; }
        .escrow-note { background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #e65100; margin-top: 20px; }
    </style>
</head>
<body>
<div class="invoice-box">
    <div class="header">
        <div class="logo-block">
            <div class="logo-icon">
                <svg viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.16L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-13 7 5-2 8.5 0 9 1-2.5 1-7 2-7 7 0 0 2-2 4-2 0 0-4 5-4 8"/></svg>
            </div>
            <div class="logo-text">
                <h1>KisanSetu</h1>
                <p>National Agricultural Trading Platform</p>
            </div>
        </div>
        <div class="invoice-meta">
            <h2>INVOICE</h2>
            <p style="margin:6px 0 0; color:#666;">Date: ${date}</p>
            <p style="margin:4px 0; color:#666;">TXN ID: <strong>TXN-${shortId}</strong></p>
            <span class="badge">✅ Payment Confirmed</span>
        </div>
    </div>

    <table>
        <thead>
            <tr><th>Commodity</th><th>Quantity</th><th>Batches</th><th>Farmer</th><th style="text-align:right;">Amount</th></tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>${cropName}</strong></td>
                <td>${qty}</td>
                <td>${batchCount} batch${batchCount > 1 ? 'es' : ''}</td>
                <td>${farmerName}</td>
                <td style="text-align:right; font-weight:600;">₹${Number(amount).toLocaleString('en-IN')}</td>
            </tr>
            <tr class="total-row">
                <td colspan="4" style="text-align:right;">Total Amount (Escrow):</td>
                <td style="text-align:right;">₹${Number(amount).toLocaleString('en-IN')}</td>
            </tr>
        </tbody>
    </table>

    <div class="escrow-note">
        🔒 This transaction was processed through KisanSetu's escrow system. Funds are released to the farmer only after buyer confirms receipt.
    </div>

    <div class="footer">
        <p>Thank you for trading on <strong>KisanSetu</strong>!</p>
        <p>This is a system-generated electronic invoice. No physical signature required.</p>
    </div>
</div>
</body>
</html>`;

    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `KisanSetu_Invoice_TXN-${shortId}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
};

// ── Simple Toast ──────────────────────────────────────────────────────────
function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
        background:#2e7d32; color:white; padding:12px 24px; border-radius:10px;
        font-size:0.88rem; font-weight:600; box-shadow:0 8px 20px rgba(0,0,0,0.2);
        z-index:999; font-family:Poppins,sans-serif; transition:opacity 0.3s;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}
