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
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        const { data, error } = await supabase
            .from('produce')
            .select('*')
            .eq('farmer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Save to cache on success
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));

        renderListings(data, false);
    } catch (err) {
        console.warn("Network error or listings fetch failed. Loading from cache...", err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            renderListings(parsed.data, true);
        } else {
            renderListings([], false);
        }
    }
}


function renderListings(listings, isOffline = false) {
    const container = document.getElementById('listings-container');
    container.innerHTML = '';

    // Add Offline Indicator if needed
    if (isOffline) {
        const warning = document.createElement('div');
        warning.className = 'offline-badge sync-pulse';
        warning.style.width = '100%';
        warning.style.justifyContent = 'center';
        warning.style.marginBottom = '20px';
        warning.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Listings (Offline)';
        container.appendChild(warning);
    }

    if (listings.length === 0) {

        container.innerHTML = `
            <div style="text-align:center; padding: 50px 20px;">
                <i class="fa-solid fa-wheat-awn" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <p>You have no active listings at the moment.</p>
                <a href="sell_produce.html" class="primary-btn" style="display:inline-block; margin-top:20px; text-decoration:none;">List Your Harvest</a>
            </div>
        `;
        return;
    }

    listings.forEach(item => {
        // Mock status based on quantity for now or use a status column if exists
        const status = item.quantity > 0 ? 'Listed' : 'Settled';
        const badgeClass = `badge-${status.toLowerCase()}`;

        const card = document.createElement('div');
        card.className = 'listing-card glass-card';
        card.style.marginBottom = '20px';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="crop-title">${item.crop_name} (${item.variety || 'General'})</div>
                    <div class="crop-qty">Qty: ${item.quantity} ${item.unit}</div>
                </div>
                <span class="badge ${badgeClass}" style="background: ${status === 'Listed' ? '#e3f2fd' : '#e8f5e9'}; color: ${status === 'Listed' ? '#1565c0' : '#2e7d32'};">${status}</span>
            </div>
            <div class="details" style="margin-top: 10px;">
                <p><strong>Asking Price:</strong> <span class="price" style="color: #2e7d32; font-weight: bold;">₹${item.price} / ${item.unit}</span></p>
                <p><strong>Listed On:</strong> ${new Date(item.created_at).toLocaleDateString()}</p>
                <p><strong>Listing ID:</strong> <small style="color:#888;">${item.id.substring(0,8)}...</small></p>
            </div>
            <div class="actions" style="display: flex; gap: 10px; margin-top: 15px;">
                <a href="bid.html" class="btn btn-bids" style="flex: 1; background: #fbc02d; color: #333; text-decoration: none; padding: 10px; border-radius: 8px; text-align: center; font-weight: bold;">
                    <i class="fa-solid fa-handshake"></i> View Bids
                </a>
                <button class="btn btn-delete" onclick="window.deleteListing('${item.id}')" style="flex: 1; background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteListing(id) {
    if (!confirm('Are you sure you want to delete this listing? It will be removed from the marketplace.')) return;

    try {
        const { error } = await supabase
            .from('produce')
            .delete()
            .eq('id', id);

        if (error) throw error;
        alert('Listing deleted successfully.');
        loadListings();
    } catch (err) {
        alert('Failed to delete listing: ' + err.message);
    }
}
window.deleteListing = deleteListing;
