import { supabase } from '../supabase-config.js';
import { addToCart, getCart, removeFromCart, updateCartIndicator } from '../shared/cart-manager.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';


let LIVE_LISTINGS = [];

// Initialize Page
document.addEventListener('DOMContentLoaded', async () => {
    populateStateDropdown();
    await fetchLiveListings();

    // Attach event listeners for real-time filtering
    const cropFilter = document.getElementById('crop-filter');
    const stateFilter = document.getElementById('state-filter');
    const priceFilter = document.getElementById('price-filter');

    if (cropFilter) cropFilter.addEventListener('change', filterListings);
    if (stateFilter) stateFilter.addEventListener('change', filterListings);
    if (priceFilter) priceFilter.addEventListener('input', filterListings);

    // Initial cart status
    updateCartIndicator();
});

// Cartesian UI Logic (FR-3.3)
function toggleCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const isOpen = drawer.classList.contains('open');

    if (isOpen) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
    } else {
        renderCart();
        drawer.classList.add('open');
        overlay.classList.add('open');
    }
}
window.toggleCart = toggleCart;

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('cart-total');
    const cart = getCart();

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
        totalDisplay.innerText = `₹0`;
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="item-info">
                <h4>${item.name}</h4>
                <p>${item.variety} | ${item.qty} ${item.unit}</p>
                <span class="remove-item" onclick="window.removeItem('${item.id}')">Remove</span>
            </div>
            <div class="item-price">₹${itemTotal.toLocaleString('en-IN')}</div>
        `;
        container.appendChild(itemEl);
    });

    totalDisplay.innerText = `₹${total.toLocaleString('en-IN')}`;
}

window.removeItem = (id) => {
    removeFromCart(id);
    renderCart();
};


async function fetchLiveListings() {
    const CACHE_KEY = 'ks_cache_marketplace';
    let isOffline = false;

    try {
        // Fetch all active produce directly from the database
        const { data, error } = await supabase
            .from('produce')
            .select(`
                *,
                farmer:farmer_id (full_name)
            `)
            .gt('quantity', 0) // Only show items in stock
            .order('created_at', { ascending: false });

        if (error) throw error;

        LIVE_LISTINGS = data;
        
        // Save to cache on success
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: LIVE_LISTINGS,
            timestamp: Date.now()
        }));
    } catch (err) {
        console.warn("Network error or marketplace fetch failed. Loading from cache...", err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            LIVE_LISTINGS = parsed.data;
            isOffline = true;
        }
    }

    renderListings(LIVE_LISTINGS, isOffline);
}


function populateStateDropdown() {
    const stateSelect = document.getElementById('state-filter');
    if (!stateSelect) return;

    if (typeof window.INDIA_STATES !== 'undefined') {
        const sortedStates = Object.keys(window.INDIA_STATES).sort();
        sortedStates.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        });
    }
}

function renderListings(data, isOffline = false) {
    const container = document.getElementById('listings-container');
    if (!container) return;
    container.innerHTML = ''; 

    // Add Offline Indicator if needed
    if (isOffline) {
        const warning = document.createElement('div');
        warning.className = 'offline-badge sync-pulse';
        warning.style.gridColumn = '1 / -1';
        warning.style.justifyContent = 'center';
        warning.style.marginBottom = '20px';
        warning.style.padding = '10px';
        warning.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Marketplace (Offline)';
        container.appendChild(warning);
    }

    if (data.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color:#757575; padding:40px;">No produce found matching your filters.</p>';
        return;
    }


    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'listing-card glass-card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="crop-name">${item.crop_name}</h3>
                    <span class="crop-variety">${item.variety || 'General'}</span>
                </div>
                <div class="price">₹${item.price.toLocaleString('en-IN')} <small style="font-size:0.7rem; color:#666;">/ ${item.unit}</small></div>
            </div>
            <div class="card-body">
                <p><strong>Farmer:</strong> <span>${item.farmer?.full_name || 'Verified Farmer'}</span></p>
                <p><strong>Available:</strong> <span>${item.quantity} ${item.unit}</span></p>
                <p><strong>Harvest:</strong> <span>${new Date(item.harvest_date).toLocaleDateString()}</span></p>
            </div>
            <div class="card-actions" style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="primary-btn" style="flex: 1; padding: 10px;" onclick="window.buyNow('${item.id}')"><i class="fa-solid fa-cart-shopping"></i> Buy Now</button>
                <button class="secondary-btn" style="flex: 1; padding: 10px;" onclick="window.toggleOfferInput('${item.id}')"><i class="fa-solid fa-handshake"></i> Offer</button>
            </div>
            
            <div class="offer-form" id="offer-form-${item.id}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                <input type="number" id="offer-price-${item.id}" placeholder="Your price per ${item.unit} (₹)" step="1" style="width: 100%; margin-bottom: 10px; padding: 8px;">
                <button class="primary-btn full-width" onclick="window.submitOffer('${item.id}')">Submit Offer</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterListings() {
    const cropSearch = document.getElementById('crop-filter').value;
    const stateSearch = document.getElementById('state-filter').value;
    const maxPrice = parseFloat(document.getElementById('price-filter').value);

    const filtered = LIVE_LISTINGS.filter(item => {
        const matchCrop = cropSearch === '' || item.crop_name === cropSearch;
        const matchState = stateSearch === '' || (item.location && item.location.includes(stateSearch));
        const matchPrice = isNaN(maxPrice) || item.price <= maxPrice;

        return matchCrop && matchState && matchPrice;
    });

    renderListings(filtered);
}

// Transaction Actions (FR-3.2 & FR-3.3)
async function buyNow(listingId, event) {
    const item = LIVE_LISTINGS.find(l => l.id === listingId);
    if (!item) return;

    addToCart(item);
    
    // Visual feedback
    const btn = event?.currentTarget || window.event?.currentTarget;
    if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
        btn.style.background = '#1b5e20';
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.background = '';
        }, 2000);
    }

    // Automatically open cart to show progress
    setTimeout(toggleCart, 500);
}
window.buyNow = buyNow;



function toggleOfferInput(listingId) {
    const form = document.getElementById(`offer-form-${listingId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
}
window.toggleOfferInput = toggleOfferInput;

async function submitOffer(listingId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please login to place an offer."); return; }

    const offerInput = document.getElementById(`offer-price-${listingId}`);
    const offerPrice = parseFloat(offerInput.value);

    if (isNaN(offerPrice) || offerPrice <= 0) {
        alert('Please enter a valid amount.');
        return;
    }

    try {
        const { error } = await supabase
            .from('bids')
            .insert({
                produce_id: listingId,
                buyer_id: user.id,
                bid_price: offerPrice,
                status: 'Pending'
            });

        if (error) throw error;

        // Notify Farmer (FR-7)
        const item = LIVE_LISTINGS.find(l => l.id === listingId);
        const buyerName = sessionStorage.getItem('kisansetu_user_name') || 'A buyer';
        
        if (item && item.farmer_id) {
            await sendSystemNotification(
                item.farmer_id,
                'New Offer Received! 🌾',
                `${buyerName} has placed an offer of ₹${offerPrice} for your ${item.crop_name}.`,
                'info'
            );
        }

        alert('Offer submitted to farmer successfully!');
        toggleOfferInput(listingId);
    } catch (err) {
        console.error("Bid error:", err);
        alert('Failed to send offer: ' + err.message);
    }
}
window.submitOffer = submitOffer;
