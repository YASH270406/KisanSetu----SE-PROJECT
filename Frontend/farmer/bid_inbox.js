// Frontend/farmer/bid_inbox.js
import { supabase } from '../supabase-config.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let bids = [];
let currentView = 'active';

document.addEventListener('DOMContentLoaded', async () => {
    await loadBids();
    setupRealtime();
});

// Auto-refresh when tab gains focus
window.addEventListener('focus', () => loadBids());

/**
 * Supabase Realtime — instantly mirrors changes from buyer side
 * + polling fallback every 15s if Realtime is not enabled in Supabase
 */
function setupRealtime() {
    supabase
        .channel('farmer-bids-watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
            loadBids();
        })
        .subscribe();

    // Polling fallback — guarantees farmer sees buyer's re-counter within 15s
    setInterval(loadBids, 15000);
}

/** Switch Active / History tabs */
export function setViewMode(mode) {
    currentView = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById(`tab-${mode}`);
    if (tab) tab.classList.add('active');
    renderBids(bids);
}
window.setViewMode = setViewMode;

async function loadBids() {
    const CACHE_KEY = 'ks_cache_bids';
    let isOffline = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '../index.html'; return; }

        const { data: myProduce } = await supabase
            .from('produce').select('id').eq('farmer_id', user.id);

        if (!myProduce || myProduce.length === 0) {
            bids = [];
            renderBids([], false);
            return;
        }

        const produceIds = myProduce.map(p => p.id);

        const { data, error } = await supabase
            .from('bids')
            .select(`
                *,
                produce:produce_id (crop_name, quantity, unit, price, batch_size, total_batches),
                buyer:buyer_id (full_name)
            `)
            .in('produce_id', produceIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        bids = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: bids, timestamp: Date.now() }));

    } catch (err) {
        console.warn('Network error, loading from cache:', err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) { bids = JSON.parse(cached).data; isOffline = true; }
    }

    renderBids(bids, isOffline);
}

/**
 * STATE MACHINE — Farmer perspective
 * 
 * status=Pending,  last_countered_by=null   → Initial buyer offer  → Farmer acts
 * status=Pending,  last_countered_by=buyer  → Buyer re-countered   → Farmer acts
 * status=Counter-Offer, last_countered_by=farmer → Farmer countered → Waiting for buyer
 * status=Accepted / Rejected               → Terminal, no action
 */
function getFarmerState(bid) {
    if (bid.status === 'Accepted' || bid.status === 'Rejected') return 'terminal';
    if (bid.status === 'Counter-Offer' && bid.last_countered_by === 'farmer') return 'waiting';
    return 'actionable'; // Pending (initial or buyer re-countered)
}

function renderBids(bidList, isOffline = false) {
    const container = document.getElementById('bids-container');
    const emptyMsg = document.getElementById('empty-msg');
    const bidCountBadge = document.getElementById('bid-count');

    if (!container) return;
    container.innerHTML = '';

    const filteredList = currentView === 'active'
        ? bidList.filter(b => b.status === 'Pending' || b.status === 'Counter-Offer')
        : bidList.filter(b => b.status === 'Accepted' || b.status === 'Rejected');

    // Badge = bids where farmer needs to act
    if (bidCountBadge) {
        const actionCount = bidList.filter(b => getFarmerState(b) === 'actionable').length;
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
        if (emptyMsg) {
            emptyMsg.style.display = 'block';
            const t = emptyMsg.querySelector('h3');
            if (t) t.textContent = currentView === 'active' ? 'No active negotiations' : 'No history yet';
        }
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    filteredList.forEach(bid => container.appendChild(buildFarmerCard(bid)));
}

function buildFarmerCard(bid) {
    const state = getFarmerState(bid);
    const isActionable = state === 'actionable';
    const isWaiting   = state === 'waiting';
    const isTerminal  = state === 'terminal';

    const askedPrice   = bid.produce?.price || 0;
    const currentOffer = bid.bid_price || 0;
    const quantity     = bid.produce?.quantity || 1;
    const unit         = bid.produce?.unit || '';
    const cropName     = bid.produce?.crop_name || 'Produce';
    const totalValue   = currentOffer * quantity;
    const diff         = currentOffer - askedPrice;
    const diffPct      = askedPrice > 0 ? Math.abs(Math.round((diff / askedPrice) * 100)) : 0;
    const timeAgo      = getTimeAgo(new Date(bid.created_at));

    // Last move label
    let lastMoveLabel;
    if (bid.last_countered_by === 'farmer')
        lastMoveLabel = '<span class="move-tag move-farmer">You countered</span>';
    else if (bid.last_countered_by === 'buyer')
        lastMoveLabel = '<span class="move-tag move-buyer">⚡ Buyer re-countered</span>';
    else
        lastMoveLabel = '<span class="move-tag move-initial">Initial offer</span>';

    // Border accent colour
    const borderColor = isWaiting ? '#8b5cf6' : isActionable ? '#f57c00'
        : bid.status === 'Accepted' ? '#2e7d32' : '#bdbdbd';

    // Status badge colour
    const statusColors = { Pending: '#f57c00', 'Counter-Offer': '#8b5cf6', Accepted: '#2e7d32', Rejected: '#bdbdbd' };
    const badgeColor = statusColors[bid.status] || '#78909c';

    // Offer label from farmer's POV
    const offerLabel = bid.last_countered_by === 'farmer'
        ? 'Your Counter-Offer'
        : bid.last_countered_by === 'buyer'
            ? "Buyer's Counter"
            : "Buyer's Offer";

    const card = document.createElement('div');
    card.className = 'bid-card';
    card.style.borderLeft = `6px solid ${borderColor}`;
    card.id = `bid-card-${bid.id}`;

    card.innerHTML = `
        <div class="bid-card-header">
            <div class="buyer-info">
                <div class="buyer-avatar" style="background:${isWaiting ? '#ede9fe' : isActionable ? '#fff3e0' : '#e8f5e9'};
                     color:${isWaiting ? '#7c3aed' : isActionable ? '#e65100' : '#2e7d32'}">
                    ${bid.buyer?.full_name ? bid.buyer.full_name.charAt(0).toUpperCase() : 'B'}
                </div>
                <div>
                    <h4 class="buyer-name">${bid.buyer?.full_name || 'Verified Buyer'}</h4>
                    <div class="bid-meta">
                        <span><i class="fa-regular fa-clock"></i> ${timeAgo}</span>
                        ${lastMoveLabel}
                    </div>
                </div>
            </div>
            <span class="status-badge" style="background:${badgeColor}; color:#fff; border:none; padding:5px 13px; border-radius:20px; font-size:0.75rem; font-weight:700; white-space:nowrap;">
                ${isWaiting ? '⏳ Awaiting Buyer' : bid.status}
            </span>
        </div>

        <!-- Negotiation Trail -->
        <div class="negotiation-trail">
            <div class="trail-row">
                <div class="trail-item">
                    <span class="trail-label"><i class="fa-solid fa-seedling"></i> Crop &amp; Qty</span>
                    <span class="trail-value">${cropName} &bull; ${quantity} ${unit}</span>
                </div>
                <div class="trail-item">
                    <span class="trail-label"><i class="fa-solid fa-tag"></i> Your Asking</span>
                    <span class="trail-value">₹${askedPrice}<small>/${unit}</small></span>
                </div>
            </div>
            ${bid.batch_count && bid.batch_count > 1 ? `
            <div class="trail-row" style="margin-top:8px;">
                <div class="trail-item">
                    <span class="trail-label"><i class="fa-solid fa-boxes-stacked"></i> Batch Order</span>
                    <span class="trail-value">${bid.batch_count} batch${bid.batch_count > 1 ? 'es' : ''} &bull; ${(bid.batch_count * (bid.produce?.batch_size || 0)).toFixed(1)} ${unit} total</span>
                </div>
            </div>` : ''}
            <div class="trail-divider">
                <span class="trail-divider-line"></span>
                <span class="trail-divider-icon"><i class="fa-solid fa-arrow-down"></i></span>
                <span class="trail-divider-line"></span>
            </div>
            <div class="trail-current ${isWaiting ? 'trail-by-farmer' : 'trail-by-buyer'}">
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
                <span class="trail-total-val">₹${totalValue.toLocaleString('en-IN')}</span>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="bid-actions" id="actions-${bid.id}">
            ${isActionable ? `
                <button class="btn-accept" onclick="window.updateBidStatus('${bid.id}', 'Accepted')">
                    <i class="fa-solid fa-handshake"></i> Accept Deal
                </button>
                <button class="btn-counter" onclick="window.showCounterForm('${bid.id}', ${currentOffer})">
                    <i class="fa-solid fa-arrows-rotate"></i> Counter
                </button>
                <button class="btn-reject" onclick="window.updateBidStatus('${bid.id}', 'Rejected')">
                    <i class="fa-solid fa-xmark"></i> Decline
                </button>
            ` : isWaiting ? `
                <div class="waiting-state">
                    <i class="fa-solid fa-hourglass-half"></i>
                    Counter sent at ₹${currentOffer} — Waiting for buyer's response...
                </div>
            ` : bid.status === 'Accepted' ? `
                <div class="terminal-state terminal-success">
                    <i class="fa-solid fa-circle-check"></i> Deal Accepted — Awaiting Buyer Payment
                </div>
            ` : `
                <div class="terminal-state terminal-rejected">
                    <i class="fa-solid fa-circle-xmark"></i> Deal Closed
                </div>
            `}
        </div>

        <!-- Inline Counter Form (hidden by default) -->
        <div class="counter-form-inline" id="cf-${bid.id}" style="display:none;">
            <label><i class="fa-solid fa-pen-to-square"></i> Enter your counter-offer (per ${unit})</label>
            <div class="counter-input-row">
                <span class="currency-sym">₹</span>
                <input type="number" id="cf-input-${bid.id}" value="${currentOffer}" step="0.5" min="0" placeholder="e.g. ${askedPrice}" />
                <button onclick="window.submitFarmerCounter('${bid.id}')">
                    Send <i class="fa-solid fa-paper-plane"></i>
                </button>
                <button class="btn-cancel-counter" onclick="window.hideCounterForm('${bid.id}')">Cancel</button>
            </div>
        </div>
    `;

    return card;
}

/* ── Exposed Window Functions ─────────────────────────────────── */

window.showCounterForm = (bidId) => {
    const form = document.getElementById(`cf-${bidId}`);
    if (form) {
        form.style.display = 'block';
        const input = document.getElementById(`cf-input-${bidId}`);
        if (input) { input.focus(); input.select(); }
    }
};

window.hideCounterForm = (bidId) => {
    const form = document.getElementById(`cf-${bidId}`);
    if (form) form.style.display = 'none';
};

window.submitFarmerCounter = async (bidId) => {
    const input = document.getElementById(`cf-input-${bidId}`);
    if (!input) return;
    const newPrice = parseFloat(input.value);
    if (!newPrice || isNaN(newPrice) || newPrice <= 0) {
        alert('Please enter a valid price.');
        return;
    }

    const bid = bids.find(b => b.id === bidId);
    try {
        const { data: updated, error } = await supabase
            .from('bids')
            .update({ bid_price: newPrice, status: 'Counter-Offer', last_countered_by: 'farmer' })
            .eq('id', bidId)
            .select();

        if (error) throw error;

        if (!updated || updated.length === 0) {
            alert('Permission error: counter could not be saved. Check RLS policies.');
            return;
        }

        const farmerName = sessionStorage.getItem('kisansetu_user_name') || 'The farmer';
        await sendSystemNotification(
            bid.buyer_id,
            '🔄 New Counter-Offer!',
            `${farmerName} countered at ₹${newPrice} for ${bid.produce?.crop_name || 'produce'}. Check Bids & Offers!`,
            'info'
        );

        await loadBids();
    } catch (err) {
        alert('Failed to send counter: ' + err.message);
    }
};

window.updateBidStatus = async (bidId, status) => {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this bid?`)) return;

    const bid = bids.find(b => b.id === bidId);
    try {
        const { error } = await supabase
            .from('bids').update({ status }).eq('id', bidId);

        if (error) throw error;

        // When accepted, reduce produce quantity by (batch_count × batch_size)
        if (status === 'Accepted' && bid) {
            const batchCount = bid.batch_count || 1;
            const batchSize  = bid.produce?.batch_size || bid.produce?.quantity || 0;
            const reduceBy   = batchCount * batchSize;

            if (reduceBy > 0) {
                const newQty    = Math.max(0, (bid.produce?.quantity || 0) - reduceBy);
                const newStatus = newQty <= 0 ? 'Sold Out' : 'Available';

                await supabase
                    .from('produce')
                    .update({ quantity: newQty, status: newStatus })
                    .eq('id', bid.produce_id);

                console.log(`Produce quantity reduced by ${reduceBy}. New qty: ${newQty} (${newStatus})`);
            }
        }

        const farmerName = sessionStorage.getItem('kisansetu_user_name') || 'The farmer';
        await sendSystemNotification(
            bid.buyer_id,
            `${status === 'Accepted' ? '✅' : '❌'} Offer ${status}!`,
            `${farmerName} has ${status.toLowerCase()} your offer for ${bid.produce?.crop_name || 'produce'}.`,
            status === 'Accepted' ? 'success' : 'warning'
        );

        await loadBids();
    } catch (err) {
        alert('Action failed: ' + err.message);
    }
};

/* ── Helpers ──────────────────────────────────────────────────── */

function getTimeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
