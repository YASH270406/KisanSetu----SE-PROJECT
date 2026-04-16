import { supabase } from '../supabase-config.js';
import { addToCart, getCart, removeFromCart, updateCartIndicator, updateCartQty } from '../shared/cart-manager.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let LIVE_LISTINGS = [];
const batchSelections = {}; // tracks selected batch count per item id

document.addEventListener('DOMContentLoaded', async () => {
    populateStateDropdown();
    await fetchLiveListings();

    const cropFilter  = document.getElementById('crop-filter');
    const stateFilter = document.getElementById('state-filter');
    const priceFilter = document.getElementById('price-filter');

    if (cropFilter)  cropFilter.addEventListener('change', filterListings);
    if (stateFilter) stateFilter.addEventListener('change', filterListings);
    if (priceFilter) priceFilter.addEventListener('input', filterListings);

    updateCartIndicator();
});

/* ── Cart Drawer ───────────────────────────────────────────── */
function toggleCart() {
    const drawer  = document.getElementById('cart-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        drawer.classList.remove('open');
        overlay?.classList.remove('open');
    } else {
        renderCart();
        drawer.classList.add('open');
        overlay?.classList.add('open');
    }
}
window.toggleCart = toggleCart;

function renderCart() {
    const container    = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('cart-total');
    const cart = getCart();
    if (!container) return;

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
        if (totalDisplay) totalDisplay.innerText = '₹0';
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="item-info">
                <h4>${item.name}</h4>
                <p>${item.variety} | ${item.qty} ${item.unit}</p>
                <span class="remove-item" onclick="window.removeItem('${item.id}')">Remove</span>
            </div>
            <div class="item-price">₹${itemTotal.toLocaleString('en-IN')}</div>`;
        container.appendChild(el);
    });

    if (totalDisplay) totalDisplay.innerText = `₹${total.toLocaleString('en-IN')}`;
}

window.removeItem = (id) => { removeFromCart(id); renderCart(); };

/* ── Fetch Listings ────────────────────────────────────────── */
async function fetchLiveListings() {
    const CACHE_KEY = 'ks_cache_marketplace';
    let isOffline = false;

    try {
        // Show ALL listings including sold out (filter = status display, not hidden)
        const { data, error } = await supabase
            .from('produce')
            .select(`*, farmer:farmer_id (full_name)`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        LIVE_LISTINGS = data;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: LIVE_LISTINGS, timestamp: Date.now() }));

    } catch (err) {
        console.warn('Marketplace fetch failed, using cache:', err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) { LIVE_LISTINGS = JSON.parse(cached).data; isOffline = true; }
    }

    renderListings(LIVE_LISTINGS, isOffline);
}

/* ── Populate State Dropdown ───────────────────────────────── */
function populateStateDropdown() {
    const stateSelect = document.getElementById('state-filter');
    if (!stateSelect || typeof window.INDIA_STATES === 'undefined') return;
    Object.keys(window.INDIA_STATES).sort().forEach(state => {
        const opt = document.createElement('option');
        opt.value = state; opt.textContent = state;
        stateSelect.appendChild(opt);
    });
}

/* ── Render Listings ───────────────────────────────────────── */
function renderListings(data, isOffline = false) {
    const container = document.getElementById('listings-container');
    if (!container) return;
    container.innerHTML = '';

    if (isOffline) {
        const w = document.createElement('div');
        w.className = 'offline-badge sync-pulse';
        w.style.cssText = 'grid-column:1/-1; justify-content:center; margin-bottom:20px; padding:10px;';
        w.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Marketplace (Offline)';
        container.appendChild(w);
    }

    if (data.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#757575; padding:40px;">No produce found.</p>';
        return;
    }

    data.forEach(item => container.appendChild(buildProduceCard(item)));
}

function buildProduceCard(item) {
    const isSoldOut     = item.quantity <= 0 || item.status === 'Sold Out';
    const totalBatches  = item.total_batches || 1;
    const batchSize     = item.batch_size || item.quantity;
    const availBatches  = batchSize > 0 ? Math.floor(item.quantity / batchSize) : 0;
    const batchPct      = totalBatches > 0 ? Math.round((availBatches / totalBatches) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'listing-card glass-card';
    card.style.position = 'relative';
    if (isSoldOut) card.style.opacity = '0.7';

    card.innerHTML = `
        <!-- Sold Out Ribbon -->
        ${isSoldOut ? `
        <div style="position:absolute; top:0; right:0; background:#c62828; color:white; font-size:0.65rem; font-weight:700; padding:4px 12px; border-radius:0 16px 0 10px; letter-spacing:0.5px; z-index:2;">
            SOLD OUT
        </div>` : ''}

        <!-- Header -->
        <div class="card-header">
            <div>
                <h3 class="crop-name">${item.crop_name}</h3>
                <span class="crop-variety">${item.variety || 'General'}</span>
            </div>
            <div class="price">₹${item.price.toLocaleString('en-IN')} <small style="font-size:0.7rem; color:#666;">/ ${item.unit}</small></div>
        </div>

        <!-- Details -->
        <div class="card-body">
            <p><strong>Farmer:</strong> <span>${item.farmer?.full_name || 'Verified Farmer'}</span></p>
            <p><strong>Available:</strong> <span>${item.quantity} ${item.unit}</span></p>
            <p><strong>Harvest:</strong> <span>${new Date(item.harvest_date).toLocaleDateString('en-IN')}</span></p>
        </div>

        <!-- Batch Info -->
        ${totalBatches > 1 || batchSize > 0 ? `
        <div style="margin:10px 0; padding:10px; background:#f9fbe7; border-radius:8px; border:1px solid #f0f4c3;">
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:#888; margin-bottom:5px;">
                <span><i class="fa-solid fa-boxes-stacked"></i> ${availBatches}/${totalBatches} batches &bull; ${batchSize} ${item.unit}/batch</span>
                <span>${batchPct}% left</span>
            </div>
            <div style="height:5px; background:#e0e0e0; border-radius:4px;">
                <div style="height:100%; width:${batchPct}%; background:linear-gradient(90deg,#4caf50,#2e7d32); border-radius:4px; transition:width 0.3s;"></div>
            </div>
        </div>` : ''}

        <!-- Actions -->
        <div class="card-actions" style="margin-top:15px;">

            <!-- Buy Now: shows batch counter on click -->
            <div id="buy-section-${item.id}" style="margin-bottom:8px;">
                ${isSoldOut ? `
                <button disabled style="width:100%; padding:11px; border-radius:8px; background:#f5f5f5; color:#bdbdbd; border:none; font-weight:600; font-size:0.85rem; cursor:not-allowed;">
                    <i class="fa-solid fa-ban"></i> Sold Out
                </button>` : `
                <button class="primary-btn" style="width:100%; padding:11px;"
                        onclick="window.showBatchCounter('${item.id}', ${availBatches || 1}, ${batchSize || item.quantity}, ${item.price}, '${item.unit}')">
                    <i class="fa-solid fa-cart-shopping"></i> Buy Now
                </button>`}
            </div>

            <!-- Batch Counter (hidden initially) -->
            <div id="batch-counter-${item.id}" style="display:none; margin-bottom:8px;">
                <div style="background:#e8f5e9; border:1.5px solid #a5d6a7; border-radius:12px; padding:12px 14px 10px;">
                    <div style="font-size:0.7rem; color:#388e3c; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        Select Batches &bull; ${batchSize || item.quantity} ${item.unit} each
                    </div>

                    <!-- +/- counter -->
                    <div style="display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:10px;">
                        <button onclick="window.changeBatch('${item.id}', -1, ${availBatches || 1}, ${batchSize || item.quantity}, ${item.price}, '${item.unit}')"
                                style="width:40px; height:40px; border-radius:50%; border:2px solid #2e7d32; background:white; color:#2e7d32; font-size:1.3rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0;">
                            &minus;
                        </button>
                        <div style="text-align:center; min-width:80px;">
                            <div style="font-size:2rem; font-weight:800; color:#2e7d32; line-height:1;" id="bc-count-${item.id}">1</div>
                            <div style="font-size:0.7rem; font-weight:600; color:#555; margin-top:3px;" id="bc-qty-${item.id}">${batchSize || item.quantity} ${item.unit}</div>
                            <div style="font-size:0.65rem; color:#888;">batch${availBatches > 1 ? 'es (max ' + (availBatches || 1) + ')' : ''}</div>
                        </div>
                        <button onclick="window.changeBatch('${item.id}', +1, ${availBatches || 1}, ${batchSize || item.quantity}, ${item.price}, '${item.unit}')"
                                style="width:40px; height:40px; border-radius:50%; border:none; background:#2e7d32; color:white; font-size:1.3rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0;">
                            &#43;
                        </button>
                    </div>

                    <!-- Est value -->
                    <div style="text-align:center; background:white; border-radius:8px; padding:6px 10px; margin-bottom:10px;">
                        <span style="font-size:0.72rem; color:#888;">Est. at asking price: </span>
                        <span style="font-size:0.9rem; font-weight:700; color:#2e7d32;" id="bc-total-${item.id}">₹${((batchSize || item.quantity) * item.price).toLocaleString('en-IN')}</span>
                    </div>

                    <!-- Confirm + Cancel -->
                    <div style="display:flex; gap:8px;">
                        <button class="primary-btn" style="flex:1; padding:9px; font-size:0.83rem;"
                                onclick="window.addBatchesToCart('${item.id}', ${batchSize || item.quantity}, '${item.unit}')">
                            <i class="fa-solid fa-cart-plus"></i> Add to Cart
                        </button>
                        <button onclick="window.hideBatchCounter('${item.id}')"
                                style="padding:9px 14px; border:1px solid #ddd; background:white; border-radius:8px; cursor:pointer; font-size:0.83rem; color:#888;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Make Offer -->
            ${!isSoldOut ? `
            <button class="secondary-btn" style="width:100%; padding:10px; font-size:0.85rem;"
                    onclick="window.toggleOfferInput('${item.id}')">
                <i class="fa-solid fa-handshake"></i> Make Offer
            </button>` : ''}
        </div>


        <!-- Offer Form (hidden by default) -->
        ${!isSoldOut ? `
        <div class="offer-form" id="offer-form-${item.id}" style="display:none; margin-top:15px; padding:15px; border-top:1px solid #eee; background:#fafafa; border-radius:0 0 12px 12px;">
            <div style="font-size:0.8rem; font-weight:600; color:#37474f; margin-bottom:10px;">
                <i class="fa-solid fa-handshake" style="color:#2e7d32;"></i> Make an Offer
            </div>

            <!-- Batch Selector -->
            ${totalBatches > 1 ? `
            <div style="margin-bottom:10px;">
                <label style="font-size:0.75rem; color:#666; font-weight:600; display:block; margin-bottom:5px;">
                    How many batches? (1–${availBatches} available, ${batchSize} ${item.unit}/batch)
                </label>
                <input type="number" id="batch-count-${item.id}" 
                       value="1" min="1" max="${availBatches}" step="1"
                       style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px; margin-bottom:5px;"
                       oninput="window.updateOfferTotal('${item.id}', ${batchSize}, ${item.price})">
                <div id="offer-total-${item.id}" style="font-size:0.75rem; color:#2e7d32; font-weight:600;"></div>
            </div>` : ''}

            <label style="font-size:0.75rem; color:#666; font-weight:600; display:block; margin-bottom:5px;">
                Your price per ${item.unit} (₹) — Farmer asking ₹${item.price}
            </label>
            <input type="number" id="offer-price-${item.id}" placeholder="Your price (₹)" step="1" 
                   style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ddd; border-radius:6px;">
            <button class="primary-btn" style="width:100%;" onclick="window.submitOffer('${item.id}', ${batchSize})">
                <i class="fa-solid fa-paper-plane"></i> Submit Offer
            </button>
        </div>` : ''}
    `;

    return card;
}

/* ── Batch Counter Window Functions ───────────────────────── */

window.showBatchCounter = (itemId, maxBatches, batchSize, pricePerUnit, unit) => {
    // Check if already in cart to 'start where buyer left'
    const cart = getCart();
    const existing = cart.find(i => i.id === itemId);
    const initialCount = existing ? (existing.batch_count || 1) : 1;

    batchSelections[itemId] = initialCount;
    document.getElementById(`bc-count-${itemId}`).textContent = initialCount;
    
    document.getElementById(`buy-section-${itemId}`).style.display = 'none';
    document.getElementById(`batch-counter-${itemId}`).style.display = 'block';
    updateCounterDisplay(itemId, initialCount, batchSize, pricePerUnit, unit);
};

window.hideBatchCounter = (itemId) => {
    document.getElementById(`batch-counter-${itemId}`).style.display = 'none';
    document.getElementById(`buy-section-${itemId}`).style.display = 'block';
    batchSelections[itemId] = 1;
};

window.changeBatch = (itemId, delta, maxBatches, batchSize, pricePerUnit, unit) => {
    const current = batchSelections[itemId] || 1;
    const next = Math.min(maxBatches, Math.max(1, current + delta));
    batchSelections[itemId] = next;
    updateCounterDisplay(itemId, next, batchSize, pricePerUnit, unit);
};

function updateCounterDisplay(itemId, count, batchSize, pricePerUnit, unit) {
    const countEl = document.getElementById(`bc-count-${itemId}`);
    const qtyEl   = document.getElementById(`bc-qty-${itemId}`);
    const totEl   = document.getElementById(`bc-total-${itemId}`);
    if (countEl) countEl.textContent = count;
    if (qtyEl)   qtyEl.textContent   = `${(count * batchSize).toFixed(1)} ${unit}`;
    if (totEl)   totEl.textContent   = `₹${(count * batchSize * pricePerUnit).toLocaleString('en-IN')}`;
}

window.addBatchesToCart = (itemId, batchSize, unit) => {
    const item = LIVE_LISTINGS.find(l => l.id === itemId);
    if (!item) return;
    const count = batchSelections[itemId] || 1;
    const totalQty = count * (batchSize || item.quantity || 1);
    
    const cart = getCart();
    const inCart = cart.some(i => i.id === itemId);

    if (inCart) {
        // Use the new updateCartQty to precisely sync (Overwrite mode)
        updateCartQty(itemId, totalQty, count);
    } else {
        // Standard add for new items
        addToCart({ 
            ...item, 
            qty: totalQty, 
            batch_count: count,
            farmer_id: item.farmer_id 
        });
    }
    
    window.hideBatchCounter(itemId);
    setTimeout(toggleCart, 300);
};

/* ── Live Offer Total Preview ──────────────────────────────── */
window.updateOfferTotal = (itemId, batchSize, pricePerUnit) => {
    const batchInput = document.getElementById(`batch-count-${itemId}`);
    const totalEl    = document.getElementById(`offer-total-${itemId}`);
    if (!batchInput || !totalEl) return;
    const batches = parseInt(batchInput.value) || 1;
    const totalQty = batches * batchSize;
    const totalVal = totalQty * pricePerUnit;
    totalEl.textContent = `📦 ${batches} batch${batches > 1 ? 'es' : ''} = ${totalQty} ${''} | Est. ₹${totalVal.toLocaleString('en-IN')} at asking price`;
};

/* ── Filter ────────────────────────────────────────────────── */
function filterListings() {
    const crop  = document.getElementById('crop-filter')?.value || '';
    const state = document.getElementById('state-filter')?.value || '';
    const maxP  = parseFloat(document.getElementById('price-filter')?.value);

    const filtered = LIVE_LISTINGS.filter(item => {
        const matchCrop  = crop === ''  || item.crop_name === crop;
        const matchState = state === '' || (item.location && item.location.includes(state));
        const matchPrice = isNaN(maxP)  || item.price <= maxP;
        return matchCrop && matchState && matchPrice;
    });

    renderListings(filtered);
}

/* ── Buy Now (cart) ────────────────────────────────────────── */
async function buyNow(listingId) {
    const item = LIVE_LISTINGS.find(l => l.id === listingId);
    if (!item || item.quantity <= 0) return;
    
    addToCart({
        ...item,
        qty: item.batch_size || item.quantity || 1,
        batch_count: 1,
        farmer_id: item.farmer_id
    });
    
    setTimeout(toggleCart, 500);
}
window.buyNow = buyNow;

/* ── Toggle Offer Form ─────────────────────────────────────── */
function toggleOfferInput(listingId) {
    const form = document.getElementById(`offer-form-${listingId}`);
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}
window.toggleOfferInput = toggleOfferInput;

/* ── Submit Offer (with batch_count) ──────────────────────── */
async function submitOffer(listingId, batchSize) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Please login to place an offer.'); return; }

    const offerInput  = document.getElementById(`offer-price-${listingId}`);
    const batchInput  = document.getElementById(`batch-count-${listingId}`);
    const offerPrice  = parseFloat(offerInput?.value);
    const batchCount  = parseInt(batchInput?.value) || 1;

    if (isNaN(offerPrice) || offerPrice <= 0) {
        alert('Please enter a valid offer price.');
        return;
    }

    const item = LIVE_LISTINGS.find(l => l.id === listingId);
    const availBatches = batchSize > 0 ? Math.floor((item?.quantity || 0) / batchSize) : 1;

    if (batchCount < 1 || batchCount > availBatches) {
        alert(`Please select between 1 and ${availBatches} batches.`);
        return;
    }

    try {
        const { error } = await supabase
            .from('bids')
            .insert({
                produce_id:  listingId,
                buyer_id:    user.id,
                bid_price:   offerPrice,
                batch_count: batchCount,
                status:      'Pending'
            });

        if (error) throw error;

        const buyerName = sessionStorage.getItem('kisansetu_user_name') || 'A buyer';
        if (item?.farmer_id) {
            const totalQty = batchCount * batchSize;
            await sendSystemNotification(
                item.farmer_id,
                'New Offer Received! 🌾',
                `${buyerName} offered ₹${offerPrice}/${item.unit} for ${batchCount} batch${batchCount > 1 ? 'es' : ''} (${totalQty || item.quantity} ${item.unit}) of ${item.crop_name}.`,
                'info'
            );
        }

        alert(`Offer submitted! Farmer will respond shortly.`);
        toggleOfferInput(listingId);

    } catch (err) {
        console.error('Bid error:', err);
        alert('Failed to send offer: ' + err.message);
    }
}
window.submitOffer = submitOffer;
