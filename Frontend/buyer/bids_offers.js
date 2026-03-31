// Frontend/buyer/bids_offers.js
import { supabase } from '../supabase-config.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let bids = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Buyer Bids/Offers initialized.");
    await loadBids();
});

/**
 * Handle page focus to auto-refresh data (Bidirectional sync)
 */
window.addEventListener('focus', async () => {
    console.log("Page focused, refreshing bids...");
    await loadBids();
});

async function loadBids() {
    const CACHE_KEY = 'ks_cache_buyer_bids';
    let isOffline = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        // Fresh fetch from DB
        const { data, error } = await supabase
            .from('bids')
            .select(`
                *,
                produce:produce_id (
                    crop_name, 
                    quantity, 
                    unit, 
                    price,
                    farmer_id,
                    farmer:farmer_id (full_name)
                )
            `)
            .eq('buyer_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        bids = data;
        
        // Update local cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: bids,
            timestamp: Date.now()
        }));
    } catch (err) {
        console.warn("Network error or fetch failed. Using cache.", err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            bids = parsed.data;
            isOffline = true;
        }
    }

    renderBids(bids, isOffline);
}


function renderBids(bidList, isOffline = false) {
    const container = document.getElementById('bids-container');
    const emptyMsg = document.getElementById('empty-msg');
    const bidCountBadge = document.getElementById('bid-count');

    if (!container) return;
    container.innerHTML = '';
    
    if (bidCountBadge) {
        bidCountBadge.innerText = bidList.length;
        bidCountBadge.style.display = bidList.length > 0 ? 'inline-block' : 'none';
    }

    if (isOffline) {
        const warning = document.createElement('div');
        warning.className = 'offline-badge sync-pulse';
        warning.style.width = '100%';
        warning.style.justifyContent = 'center';
        warning.style.marginBottom = '20px';
        warning.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Offline Data';
        container.appendChild(warning);
    }

    if (bidList.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    bidList.forEach(bid => {
        const timeAgo = getTimeAgo(new Date(bid.created_at));
        const quantity = bid.produce?.quantity || 1;
        const totalValue = bid.bid_price * quantity;
        const farmerName = bid.produce?.farmer?.full_name || 'Verified Farmer';

        const card = document.createElement('div');
        card.className = 'bid-card glass-card';
        card.style.marginBottom = '20px';
        
        card.innerHTML = `
            <div class="bid-card-header">
                <div class="buyer-info">
                    <div class="buyer-avatar"><i class="fa-solid fa-tractor"></i></div>
                    <div>
                        <h4 class="buyer-name">${bid.produce?.crop_name || 'Produce'} • ${quantity} ${bid.produce?.unit || ''}</h4>
                        <p class="bid-time">
                            <i class="fa-regular fa-user"></i> Seller: ${farmerName} | 
                            <i class="fa-regular fa-clock"></i> ${timeAgo}
                        </p>
                    </div>
                </div>
                <span class="status-badge" style="background: ${getStatusColor(bid.status)}; color: white; border: none; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${bid.status}</span>
            </div>

            <div class="bid-details">
                <div class="detail-row">
                    <span class="detail-label">Farmer Asking</span>
                    <span class="detail-value">₹${bid.produce?.price || 0} / ${bid.produce?.unit || ''}</span>
                </div>
                <div class="detail-row highlight" style="background: ${bid.status === 'Counter-Offer' ? '#fff9c4' : '#fffde7'}">
                    <span class="detail-label">${bid.status === 'Counter-Offer' ? 'Counter-Offer Received' : 'Your Offer'}</span>
                    <span class="detail-value offer-price" style="color: ${bid.status === 'Counter-Offer' ? '#e65100' : ''}">₹${bid.bid_price} / ${bid.produce?.unit || ''}</span>
                </div>
                <div class="detail-row total" style="background: #fffde7; padding: 8px; border-radius: 6px; margin-top: 5px;">
                    <span class="detail-label">Total Value</span>
                    <span class="detail-value total-value">₹${totalValue.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div class="bid-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                ${bid.status === 'Accepted' ? `
                    <button class="btn-accept" style="width: 100%;" onclick="window.location.href='checkout.html?bid=${bid.id}'">
                        <i class="fa-solid fa-credit-card"></i> Pay Now
                    </button>
                ` : bid.status === 'Counter-Offer' ? `
                    <button class="btn-accept" style="flex: 1;" onclick="window.handleCounterResponse('${bid.id}', 'Accepted')">
                        <i class="fa-solid fa-check"></i> Accept
                    </button>
                    <button class="btn-counter" style="flex: 1;" onclick="window.handleReverseCounter('${bid.id}', ${bid.bid_price})">
                        <i class="fa-solid fa-arrow-right-arrow-left"></i> Negotiate
                    </button>
                    <button class="btn-reject" style="flex: 1;" onclick="window.handleCounterResponse('${bid.id}', 'Rejected')">
                        <i class="fa-solid fa-xmark"></i> Decline
                    </button>
                ` : bid.status === 'Pending' ? `
                    <div style="text-align: center; width: 100%; color: #888; font-size: 0.85rem; padding: 10px; background: #f5f5f5; border-radius: 8px;">
                        <i class="fa-solid fa-hourglass-half"></i> Waiting for Farmer Response
                    </div>
                ` : `
                    <div style="text-align: center; width: 100%; color: #888; font-size: 0.85rem; padding: 10px; background: #f5f5f5; border-radius: 8px;">
                        Status: ${bid.status}
                    </div>
                `}
            </div>
        `;
        container.appendChild(card);
    });
}

window.handleCounterResponse = async (bidId, finalStatus) => {
    if (!confirm(`Are you sure you want to ${finalStatus.toLowerCase()} this counter-offer?`)) return;

    try {
        const { error } = await supabase
            .from('bids')
            .update({ status: finalStatus })
            .eq('id', bidId);

        if (error) throw error;

        // Notify Farmer
        const bid = bids.find(b => b.id === bidId);
        const buyerName = sessionStorage.getItem('kisansetu_user_name') || 'The buyer';
        
        await sendSystemNotification(
            bid.produce?.farmer_id,
            `Offer ${finalStatus}!`,
            `${buyerName} has ${finalStatus.toLowerCase()} your counter-offer for ${bid.produce?.crop_name || 'produce'}.`,
            finalStatus === 'Accepted' ? 'success' : 'warning'
        );

        alert(`Response sent: ${finalStatus}`);
        await loadBids();
    } catch (err) {
        alert("Action failed: " + err.message);
    }
};

window.handleReverseCounter = async (bidId, currentPrice) => {
    const newPrice = prompt("Enter your new negotiated price (per unit):", currentPrice);
    if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) === currentPrice) return;

    try {
        const { error } = await supabase
            .from('bids')
            .update({ 
                bid_price: parseFloat(newPrice),
                status: 'Pending' 
            })
            .eq('id', bidId);

        if (error) throw error;

        // Notify Farmer
        const bid = bids.find(b => b.id === bidId);
        const buyerName = sessionStorage.getItem('kisansetu_user_name') || 'The buyer';

        await sendSystemNotification(
            bid.produce?.farmer_id,
            'Price Renegotiated!',
            `${buyerName} proposed a new price of ₹${newPrice} for ${bid.produce?.crop_name || 'produce'}.`,
            'info'
        );

        alert("New offer sent to farmer!");
        await loadBids();
    } catch (err) {
        alert("Negotiation failed: " + err.message);
    }
};

function getStatusColor(status) {
    switch (status) {
        case 'Accepted': return '#2e7d32'; // Green
        case 'Rejected': return '#d32f2f'; // Red
        case 'Counter-Offer': return '#fbc02d'; // Yellow/Gold
        case 'Pending': return '#f57c00'; // Orange
        default: return '#78909c'; // Gray
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}
