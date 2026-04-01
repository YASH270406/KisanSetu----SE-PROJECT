// Frontend/farmer/my_listings.js
import { supabase } from '../supabase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadListings();
});

async function loadListings() {
    const CACHE_KEY = 'ks_cache_my_listings';
    let isOffline = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '../index.html'; return; }

        // Fetch listings WITH bid count and bids array (to check if any bids exist)
        const { data, error } = await supabase
            .from('produce')
            .select(`
                *,
                bids(id, status)
            `)
            .eq('farmer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        renderListings(data, false);

    } catch (err) {
        console.warn('Network error, loading from cache:', err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            renderListings(JSON.parse(cached).data, true);
        } else {
            renderListings([], false);
        }
    }
}

function renderListings(listings, isOffline = false) {
    const container = document.getElementById('listings-container');
    const emptyMsg  = document.getElementById('empty-msg');
    const badge     = document.getElementById('listing-count');
    const sub       = document.getElementById('listing-sub');
    container.innerHTML = '';

    // Update header badge
    if (badge) {
        badge.textContent = listings.length;
        badge.style.display = listings.length > 0 ? 'inline-block' : 'none';
    }
    if (sub) sub.textContent = listings.length > 0 ? `${listings.length} listing${listings.length > 1 ? 's' : ''}` : '';

    if (isOffline) {
        const w = document.createElement('div');
        w.className = 'offline-badge sync-pulse';
        w.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Listings (Offline)';
        container.appendChild(w);
    }

    if (listings.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    listings.forEach(item => buildListingCard(item, container));
}

function buildListingCard(item, container) {
    const bidCount      = item.bids?.length || 0;
    const activeBids    = item.bids?.filter(b => b.status === 'Pending' || b.status === 'Counter-Offer').length || 0;
    const hasBids       = bidCount > 0;
    const isSoldOut     = item.quantity <= 0 || item.status === 'Sold Out';

    const totalBatches  = item.total_batches || 1;
    const batchSize     = item.batch_size || item.quantity;
    const availBatches  = batchSize > 0 ? Math.floor(item.quantity / batchSize) : 0;
    const batchPct      = totalBatches > 0 ? Math.round((availBatches / totalBatches) * 100) : 0;
    const canModify     = !hasBids;
    const lockReason    = 'Buyers have placed bids — cannot edit or delete';

    // Status badge
    let statusBg, statusColor, statusLabel;
    if (isSoldOut)       { statusLabel='Sold Out';    statusBg='#ffebee'; statusColor='#c62828'; }
    else if (activeBids) { statusLabel='Negotiating'; statusBg='#fff8e1'; statusColor='#f57c00'; }
    else                 { statusLabel='Available';   statusBg='#e8f5e9'; statusColor='#2e7d32'; }

    // Progress bar color
    const barColor = batchPct > 50 ? '#4caf50' : batchPct > 20 ? '#fbc02d' : '#ef5350';

    const card = document.createElement('div');
    card.className = 'listing-card';
    card.style.borderLeftColor = statusColor;
    if (isSoldOut) card.style.opacity = '0.78';

    card.innerHTML = `
        <!-- Crop title row -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div>
                <div style="font-size:1rem; font-weight:700; color:#37474f;">
                    ${item.crop_name} <span style="font-weight:400; color:#999;">(${item.variety || 'General'})</span>
                </div>
                <div style="font-size:0.72rem; color:#aaa; margin-top:1px;">
                    Listed ${new Date(item.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}
                    &nbsp;&bull;&nbsp;
                    ID: <code style="font-size:0.65rem;">${item.id.substring(0,8)}</code>
                </div>
            </div>
            <span class="status-badge" style="background:${statusBg}; color:${statusColor};">${statusLabel}</span>
        </div>

        <!-- Stats row -->
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-label">Asking</div>
                <div class="stat-val">₹${item.price}</div>
                <div class="stat-unit">per ${item.unit}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Remaining</div>
                <div class="stat-val neutral">${item.quantity}</div>
                <div class="stat-unit">${item.unit}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Bids</div>
                <div class="stat-val ${activeBids > 0 ? 'warning' : 'neutral'}">${bidCount}</div>
                <div class="stat-unit">${activeBids} active</div>
            </div>
        </div>

        <!-- Batch progress -->
        <div class="batch-row">
            <i class="fa-solid fa-boxes-stacked" style="color:#2e7d32; flex-shrink:0;"></i>
            <span>${availBatches} of ${totalBatches} batches available (${batchSize} ${item.unit}/batch)</span>
            <div class="batch-bar"><div class="batch-fill" style="width:${batchPct}%; background:${barColor};"></div></div>
            <span>${batchPct}%</span>
        </div>

        <!-- Notices -->
        ${isSoldOut ? `
        <div class="sold-out-notice">
            <i class="fa-solid fa-circle-xmark"></i> All batches sold — this listing is complete!
        </div>` : ''}

        ${hasBids && !isSoldOut ? `
        <div class="bid-lock-notice">
            <i class="fa-solid fa-lock"></i>
            ${bidCount} bid(s) placed — editing and deleting are locked
        </div>` : ''}

        <!-- Actions -->
        <div class="card-actions">
            <a href="bid.html" class="btn-view-bids">
                <i class="fa-solid fa-handshake"></i>
                View Bids
                ${activeBids > 0 ? `<span style="background:#e65100; color:white; border-radius:10px; padding:1px 7px; font-size:0.68rem;">${activeBids}</span>` : ''}
            </a>

            ${!isSoldOut ? `
            <button
                onclick="${canModify ? `window.location.href='sell_produce.html?edit=${item.id}'` : `alert('${lockReason}')`}"
                class="btn-edit" ${!canModify ? 'disabled' : ''}>
                <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            ` : ''}

            <button
                onclick="${canModify ? `window.deleteListing('${item.id}')` : `alert('${lockReason}')`}"
                class="btn-delete" ${!canModify ? 'disabled' : ''}>
                <i class="fa-solid fa-trash"></i> Delete
            </button>
        </div>
    `;

    container.appendChild(card);
}

/* ── Delete ─────────────────────────────────────────────────── */
async function deleteListing(id) {
    if (!confirm('Are you sure you want to delete this listing? It will be removed from the marketplace.')) return;

    try {
        // Double-check no bids before deleting
        const { data: existingBids } = await supabase.from('bids').select('id').eq('produce_id', id).limit(1);
        if (existingBids && existingBids.length > 0) {
            alert('Cannot delete: buyers have already placed bids on this listing.');
            return;
        }

        const { error } = await supabase.from('produce').delete().eq('id', id);
        if (error) throw error;

        alert('Listing deleted successfully.');
        loadListings();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}
window.deleteListing = deleteListing;
