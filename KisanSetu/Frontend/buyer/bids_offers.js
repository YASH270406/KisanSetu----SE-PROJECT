// Frontend/buyer/bids_offers.js
import { supabase } from '../supabase-config.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let bids = [];
let currentView = 'active';

document.addEventListener('DOMContentLoaded', async () => {
    await loadBids();
    setupRealtime();
});

// Auto-refresh on tab focus
window.addEventListener('focus', () => loadBids());

/**
 * Supabase Realtime — instantly reflects farmer's counter on buyer side
 * + polling fallback every 15s in case Realtime channel misses events
 */
function setupRealtime() {
    supabase
        .channel('buyer-bids-watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
            loadBids();
        })
        .subscribe();

    // Polling fallback — guarantees refresh even if Realtime is not enabled
    setInterval(loadBids, 15000);
}

window.setViewMode = (mode) => {
    currentView = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById(`tab-${mode}`);
    if (tab) tab.classList.add('active');
    renderBids(bids);
};

async function loadBids() {
    const CACHE_KEY = 'ks_cache_buyer_bids';
    let isOffline = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '../index.html'; return; }

        const { data, error } = await supabase
            .from('bids')
            .select(`
                *,
                produce:produce_id (
                    crop_name, quantity, unit, price,
                    batch_size, total_batches,
                    farmer_id,
                    farmer:farmer_id (full_name)
                )
            `)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        bids = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: bids, timestamp: Date.now() }));

    } catch (err) {
        console.warn('Using cached buyer bids:', err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) { bids = JSON.parse(cached).data; isOffline = true; }
    }

    renderBids(bids, isOffline);
}

/**
 * STATE MACHINE — Buyer perspective
 *
 * status=Pending,       last_countered_by=null   → Initial offer pending    → Waiting for farmer
 * status=Pending,       last_countered_by=buyer  → Buyer re-countered       → Waiting for farmer
 * status=Counter-Offer, last_countered_by=farmer → Farmer countered back    → Buyer acts
 * status=Accepted / Rejected                     → Terminal
 */
function getBuyerState(bid) {
    if (bid.status === 'Accepted' || bid.status === 'Rejected') return 'terminal';
    if (bid.status === 'Counter-Offer' && bid.last_countered_by === 'farmer') return 'actionable';
    return 'waiting'; // Pending (initial or buyer re-countered)
}

function renderBids(bidList, isOffline = false) {
    const container = document.getElementById('bids-container');
    const emptyMsg  = document.getElementById('empty-msg');
    const bidCountBadge = document.getElementById('bid-count');

    if (!container) return;
    container.innerHTML = '';

    const filteredList = currentView === 'active'
        ? bidList.filter(b => b.status === 'Pending' || b.status === 'Counter-Offer')
        : bidList.filter(b => b.status === 'Accepted' || b.status === 'Rejected');

    // Badge = bids where buyer needs to act (farmer has countered)
    if (bidCountBadge) {
        const actionCount = bidList.filter(b => getBuyerState(b) === 'actionable').length;
        bidCountBadge.innerText = actionCount;
        bidCountBadge.style.display = actionCount > 0 ? 'inline-block' : 'none';
    }

    if (isOffline) {
        const w = document.createElement('div');
        w.className = 'offline-banner';
        w.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Data (Offline)';
        container.appendChild(w);
    }

    if (filteredList.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    filteredList.forEach(bid => container.appendChild(buildBuyerCard(bid)));
}

function buildBuyerCard(bid) {
    const state = getBuyerState(bid);
    const isActionable = state === 'actionable';
    const isWaiting    = state === 'waiting';
    const isTerminal   = state === 'terminal';

    const askedPrice   = bid.produce?.price || 0;
    const currentOffer = bid.bid_price || 0;
    const batchCount   = bid.batch_count || 1;
    const batchSize    = bid.produce?.batch_size || bid.produce?.quantity || 1;
    const unit         = bid.produce?.unit || '';
    const cropName     = bid.produce?.crop_name || 'Produce';
    const farmerName   = bid.produce?.farmer?.full_name || 'Verified Farmer';
    // Qty for THIS negotiation = batches buyer selected × size per batch
    const negotiatedQty = batchCount * batchSize;
    const totalValue   = currentOffer * negotiatedQty;
    const diff         = currentOffer - askedPrice;
    const diffPct      = askedPrice > 0 ? Math.abs(Math.round((diff / askedPrice) * 100)) : 0;
    const timeAgo      = getTimeAgo(new Date(bid.created_at));

    // Last-move label
    let lastMoveLabel;
    if (bid.last_countered_by === 'farmer')
        lastMoveLabel = '<span class="move-tag move-farmer">⚡ Farmer countered</span>';
    else if (bid.last_countered_by === 'buyer')
        lastMoveLabel = '<span class="move-tag move-buyer">You re-countered</span>';
    else
        lastMoveLabel = '<span class="move-tag move-initial">Your initial offer</span>';

    // Colours
    const borderColor = isActionable ? '#8b5cf6' : isWaiting ? '#f57c00'
        : bid.status === 'Accepted' ? '#2e7d32' : '#bdbdbd';
    const statusColors = { Pending: '#f57c00', 'Counter-Offer': '#8b5cf6', Accepted: '#2e7d32', Rejected: '#bdbdbd' };
    const badgeColor = statusColors[bid.status] || '#78909c';

    // Offer label from buyer's POV
    const offerLabel = bid.last_countered_by === 'farmer'
        ? "Farmer's Counter"
        : bid.last_countered_by === 'buyer'
            ? 'Your Counter'
            : 'Your Offer';

    // Waiting message
    const waitMessage = bid.last_countered_by === 'buyer'
        ? 'Waiting for farmer to respond to your counter...'
        : 'Waiting for farmer to review your offer...';

    const card = document.createElement('div');
    card.className = 'bid-card glass-card';
    card.style.borderLeft = `6px solid ${borderColor}`;
    card.id = `bid-card-${bid.id}`;

    card.innerHTML = `
        <div class="bid-card-header">
            <div class="buyer-info">
                <div class="buyer-avatar"
                     style="background:${isActionable ? '#ede9fe' : isWaiting ? '#fff3e0' : '#e8f5e9'};
                            color:${isActionable ? '#7c3aed' : isWaiting ? '#e65100' : '#2e7d32'}">
                    <i class="fa-solid fa-tractor"></i>
                </div>
                <div>
                    <h4 class="buyer-name">${cropName} &bull; ${negotiatedQty} ${unit}</h4>
                    <div class="bid-meta">
                        <span><i class="fa-regular fa-user"></i> ${farmerName}</span>
                        <span><i class="fa-regular fa-clock"></i> ${timeAgo}</span>
                        ${lastMoveLabel}
                    </div>
                </div>
            </div>
            <span class="status-badge"
                  style="background:${badgeColor}; color:#fff; border:none; padding:5px 13px; border-radius:20px; font-size:0.75rem; font-weight:700; white-space:nowrap;">
                ${isActionable ? '🔔 Counter!' : bid.status}
            </span>
        </div>

        <!-- Negotiation Trail -->
        <div class="negotiation-trail">
            <div class="trail-row">
                <div class="trail-item">
                    <span class="trail-label"><i class="fa-solid fa-seedling"></i> Crop &amp; Qty</span>
                    <span class="trail-value">${cropName} &bull; ${negotiatedQty} ${unit}</span>
                </div>
                <div class="trail-item">
                    <span class="trail-label"><i class="fa-solid fa-tag"></i> Farmer Asking</span>
                    <span class="trail-value">₹${askedPrice}<small>/${unit}</small></span>
                </div>
            </div>
            <div class="trail-row" style="margin-top:8px;">
                <div class="trail-item">
                    <span class="trail-label"><i class="fa-solid fa-boxes-stacked"></i> Batch Order</span>
                    <span class="trail-value">${batchCount} batch${batchCount > 1 ? 'es' : ''} &times; ${batchSize} ${unit}/batch = ${negotiatedQty} ${unit}</span>
                </div>
            </div>
            <div class="trail-divider">
                <span class="trail-divider-line"></span>
                <span class="trail-divider-icon"><i class="fa-solid fa-arrow-down"></i></span>
                <span class="trail-divider-line"></span>
            </div>
            <div class="trail-current ${isActionable ? 'trail-by-farmer' : 'trail-by-buyer'}">
                <div class="trail-current-left">
                    <span class="trail-label">${offerLabel}</span>
                    <span class="trail-offer-price">₹${currentOffer}<small>/${unit}</small></span>
                </div>
                <div class="trail-diff-badge ${diff < 0 ? 'diff-below' : 'diff-above'}">
                    ${diff < 0 ? '▼' : '▲'} ${diffPct}%<br>
                    <small>${diff < 0 ? 'below ask' : 'above ask'}</small>
                </div>
            </div>
            <div class="trail-total">
                <span>Total Deal Value</span>
                <span class="trail-total-val" id="buyer-total-${bid.id}">₹${totalValue.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:4px; font-size:0.75rem; color:#666;">
                <span id="buyer-batch-summary-${bid.id}">${batchCount} batch${batchCount > 1 ? 'es' : ''} &times; ₹${currentOffer}/${unit} &times; ${batchSize} ${unit} = ₹${totalValue.toLocaleString('en-IN')}</span>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="bid-actions" id="actions-${bid.id}" style="display:flex; gap:8px; margin-top:14px; flex-direction:column;">
            ${isActionable ? `
                <div style="display:flex; gap:8px;">
                    <button class="btn-accept" onclick="window.handleCounterResponse('${bid.id}', 'Accepted')">
                        <i class="fa-solid fa-handshake"></i> Accept
                    </button>
                    <button class="btn-counter" onclick="window.showBuyerCounterForm('${bid.id}', ${currentOffer})">
                        <i class="fa-solid fa-arrows-rotate"></i> Counter
                    </button>
                    <button class="btn-reject" onclick="window.handleCounterResponse('${bid.id}', 'Rejected')">
                        <i class="fa-solid fa-xmark"></i> Decline
                    </button>
                </div>
            ` : isWaiting ? `
                <div class="waiting-state" style="width:100%;">
                    <i class="fa-solid fa-hourglass-half"></i> ${waitMessage}
                </div>
            ` : bid.status === 'Accepted' ? `
                <!-- Deal locked — batch was chosen at offer time -->
                <div style="background:#e8f5e9; border:1.5px solid #a5d6a7; border-radius:10px; padding:12px 14px;">
                    <div style="font-size:0.72rem; color:#388e3c; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
                        <i class="fa-solid fa-circle-check"></i> Deal Accepted — Your Order
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="font-size:0.82rem; color:#37474f;">
                            <strong>${batchCount}</strong> batch${batchCount > 1 ? 'es' : ''}
                            &times; ${batchSize} ${unit}/batch
                            = <strong>${negotiatedQty} ${unit}</strong>
                        </div>
                        <div style="font-size:1rem; font-weight:800; color:#2e7d32;">
                            ₹${totalValue.toLocaleString('en-IN')}
                        </div>
                    </div>
                    <button class="btn-accept" style="width:100%;" onclick="window.location.href='checkout.html?bid=${bid.id}'">
                        <i class="fa-solid fa-credit-card"></i> Pay Now
                    </button>
                </div>
            ` : `
                <div class="terminal-state terminal-rejected" style="width:100%;">
                    <i class="fa-solid fa-circle-xmark"></i> Deal Closed
                </div>
            `}
        </div>

        <!-- Inline Counter Form (hidden by default) -->
        <div class="counter-form-inline" id="bcf-${bid.id}" style="display:none; margin-top:12px;">
            <label><i class="fa-solid fa-pen-to-square"></i> Your counter-offer price (per ${unit})</label>
            <div class="counter-input-row">
                <span class="currency-sym">₹</span>
                <input type="number" id="bcf-input-${bid.id}" value="${currentOffer}" step="0.5" min="0" />
                <button onclick="window.submitBuyerCounter('${bid.id}')">
                    Send <i class="fa-solid fa-paper-plane"></i>
                </button>
                <button class="btn-cancel-counter" onclick="window.hideBuyerCounterForm('${bid.id}')">Cancel</button>
            </div>
        </div>
    `;

    return card;
}

/* ── Batch counter for Pay Now ────────────────────────────────────────────── */

// Track selected pay-batch per bid
const payBatchSelections = {};

window.changeBuyerBatchCount = (bidId, delta, maxBatches, batchSize, pricePerUnit, unit) => {
    const current = payBatchSelections[bidId] || 1;
    const next = Math.min(maxBatches, Math.max(1, current + delta));
    payBatchSelections[bidId] = next;

    const countEl = document.getElementById(`pay-batch-count-${bidId}`);
    const qtyEl   = document.getElementById(`pay-batch-qty-${bidId}`);
    const totEl   = document.getElementById(`pay-batch-total-${bidId}`);

    if (countEl) countEl.textContent = next;
    if (qtyEl)   qtyEl.textContent   = `${(next * batchSize).toFixed(1)} ${unit}`;
    if (totEl)   totEl.textContent   = `Est. Total: ₹${(next * batchSize * pricePerUnit).toLocaleString('en-IN')}`;
};

window.proceedToPayment = async (bidId, batchSize, pricePerUnit, unit) => {
    const selectedBatches = payBatchSelections[bidId] || 1;

    try {
        // Write chosen batch_count back to the bid before checkout reads it
        const { error } = await supabase
            .from('bids')
            .update({ batch_count: selectedBatches })
            .eq('id', bidId);

        if (error) throw error;

        window.location.href = `checkout.html?bid=${bidId}`;
    } catch (err) {
        alert('Could not save batch selection: ' + err.message);
    }
};

/* ── Exposed Window Functions ─────────────────────────────────── */

window.showBuyerCounterForm = (bidId) => {
    const form = document.getElementById(`bcf-${bidId}`);
    if (form) {
        form.style.display = 'block';
        const inp = document.getElementById(`bcf-input-${bidId}`);
        if (inp) { inp.focus(); inp.select(); }
    }
};

window.hideBuyerCounterForm = (bidId) => {
    const f = document.getElementById(`bcf-${bidId}`);
    if (f) f.style.display = 'none';
};

window.submitBuyerCounter = async (bidId) => {
    const input = document.getElementById(`bcf-input-${bidId}`);
    if (!input) return;
    const newPrice = parseFloat(input.value);
    if (!newPrice || isNaN(newPrice) || newPrice <= 0) { alert('Enter a valid price.'); return; }

    const bid = bids.find(b => b.id === bidId);
    try {
        const { data: updated, error } = await supabase
            .from('bids')
            .update({ bid_price: newPrice, status: 'Pending', last_countered_by: 'buyer' })
            .eq('id', bidId)
            .select(); // returns updated rows — empty if RLS blocked it

        if (error) throw error;

        // RLS guard — if no rows returned, the update was silently blocked
        if (!updated || updated.length === 0) {
            alert('Permission error: your counter could not be saved. Please refresh and try again.');
            return;
        }

        const buyerName = sessionStorage.getItem('kisansetu_user_name') || 'The buyer';
        await sendSystemNotification(
            bid.produce?.farmer_id,
            '🔄 Buyer Re-Countered!',
            `${buyerName} proposed ₹${newPrice} for ${bid.produce?.crop_name || 'produce'}. Check your Bid Inbox!`,
            'info'
        );

        await loadBids();
    } catch (err) {
        alert('Counter failed: ' + err.message);
    }
};

window.handleCounterResponse = async (bidId, finalStatus) => {
    if (!confirm(`Are you sure you want to ${finalStatus.toLowerCase()} this offer?`)) return;

    const bid = bids.find(b => b.id === bidId);
    try {
        const { error } = await supabase.from('bids').update({ status: finalStatus }).eq('id', bidId);
        if (error) throw error;

        const buyerName = sessionStorage.getItem('kisansetu_user_name') || 'The buyer';
        await sendSystemNotification(
            bid.produce?.farmer_id,
            `${finalStatus === 'Accepted' ? '✅' : '❌'} Offer ${finalStatus}!`,
            `${buyerName} has ${finalStatus.toLowerCase()} your counter-offer for ${bid.produce?.crop_name || 'produce'}.`,
            finalStatus === 'Accepted' ? 'success' : 'warning'
        );

        await loadBids();
    } catch (err) {
        alert('Action failed: ' + err.message);
    }
};

/* ── Helper ───────────────────────────────────────────────────── */

function getTimeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
