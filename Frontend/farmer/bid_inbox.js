// Frontend/farmer/bid_inbox.js
import { supabase } from '../supabase-config.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let bids = [];
let currentView = 'active'; // 'active' or 'history'

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Bid Inbox initialized. Mode:", currentView);
    await loadBids();
});

/**
 * Switch between Active and History tabs
 * Exposed to window for HTML onclick access
 */
export function setViewMode(mode) {
    console.log("Switching view mode to:", mode);
    currentView = mode;
    
    // Update UI tabs
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'active') {
        const activeTab = document.getElementById('tab-active');
        if (activeTab) activeTab.classList.add('active');
    } else {
        const historyTab = document.getElementById('tab-history');
        if (historyTab) historyTab.classList.add('active');
    }

    renderBids(bids);
}
window.setViewMode = setViewMode;

async function loadBids() {
    const CACHE_KEY = 'ks_cache_bids';
    let isOffline = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        // Fetch farmer's produce IDs
        const { data: myProduce } = await supabase
            .from('produce')
            .select('id')
            .eq('farmer_id', user.id);
        
        if (!myProduce || myProduce.length === 0) {
            renderBids([], false);
            return;
        }
        
        const produceIds = myProduce.map(p => p.id);

        // Fetch bids for those IDs
        const { data, error } = await supabase
            .from('bids')
            .select(`
                *,
                produce:produce_id (crop_name, quantity, unit, price),
                buyer:buyer_id (full_name)
            `)
            .in('produce_id', produceIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        bids = data;
        
        // Save to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: bids,
            timestamp: Date.now()
        }));
    } catch (err) {
        console.warn("Network error or bids fetch failed. Loading from cache...", err);
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

    // Filter list based on current view
    let filteredList = [];
    if (currentView === 'active') {
        filteredList = bidList.filter(b => b.status === 'Pending' || b.status === 'Counter-Offer');
        
        // Update badge only for active bids
        if (bidCountBadge) {
            bidCountBadge.innerText = filteredList.length;
            bidCountBadge.style.display = filteredList.length > 0 ? 'inline-block' : 'none';
        }
    } else {
        filteredList = bidList.filter(b => b.status === 'Accepted' || b.status === 'Rejected');
    }

    if (isOffline) {
        const warning = document.createElement('div');
        warning.className = 'offline-badge sync-pulse';
        warning.style.width = '100%';
        warning.style.justifyContent = 'center';
        warning.style.marginBottom = '20px';
        warning.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Viewing Cached Bids (Offline)';
        container.appendChild(warning);
    }

    if (filteredList.length === 0) {
        if (emptyMsg) {
            emptyMsg.style.display = 'block';
            const emptyTitle = emptyMsg.querySelector('h3');
            if (emptyTitle) {
                emptyTitle.textContent = currentView === 'active' 
                    ? "No pending bids right now" 
                    : "No transaction history yet";
            }
        }
        return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    filteredList.forEach(bid => {
        const timeAgo = getTimeAgo(new Date(bid.created_at));
        const totalValue = bid.bid_price * (bid.produce?.quantity || 1);
        const isHistory = currentView === 'history';

        const card = document.createElement('div');
        card.className = `bid-card ${bid.status.toLowerCase()}`;
        if (bid.status === 'Counter-Offer') card.style.borderLeft = '6px solid #fbc02d';
        
        card.innerHTML = `
            <div class="bid-card-header">
                <div class="buyer-info">
                    <div class="buyer-avatar">${bid.buyer?.full_name ? bid.buyer.full_name.charAt(0) : 'B'}</div>
                    <div>
                        <h4 class="buyer-name">${bid.buyer?.full_name || 'Verified Buyer'}</h4>
                        <p class="bid-time"><i class="fa-regular fa-clock"></i> ${timeAgo}</p>
                    </div>
                </div>
                <span class="status-badge" style="background: ${getStatusColor(bid.status)}; color: white; border: none; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${bid.status}</span>
            </div>

            <div class="bid-details">
                <div class="detail-row">
                    <span class="detail-label">Crop & Quantity</span>
                    <span class="detail-value">${bid.produce?.crop_name || 'Produce'} • ${bid.produce?.quantity || 0} ${bid.produce?.unit || ''}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Your Asking</span>
                    <span class="detail-value">₹${bid.produce?.price || 0} / ${bid.produce?.unit || ''}</span>
                </div>
                <div class="detail-row highlight">
                    <span class="detail-label">${bid.status === 'Counter-Offer' ? 'Counter-Offer Sent' : 'Buyer Offer'}</span>
                    <span class="detail-value offer-price" style="color: ${bid.status === 'Counter-Offer' ? '#e65100' : ''}">₹${bid.bid_price} / ${bid.produce?.unit || ''}</span>
                </div>
                <div class="detail-row total" style="background: #fffde7; padding: 8px; border-radius: 6px; margin-top: 5px;">
                    <span class="detail-label">Total Value</span>
                    <span class="detail-value total-value">₹${totalValue.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div class="bid-actions" id="actions-${bid.id}">
                ${!isHistory ? `
                    <button class="btn-accept" onclick="window.updateBidStatus('${bid.id}', 'Accepted')">
                        <i class="fa-solid fa-check"></i> Accept Deal
                    </button>
                    ${bid.status === 'Pending' ? `
                    <button class="btn-counter" onclick="window.openCounterForm('${bid.id}', ${bid.bid_price})">
                        <i class="fa-solid fa-arrow-right-arrow-left"></i> Counter-offer
                    </button>
                    ` : `
                    <button class="btn-counter" style="opacity: 0.7; cursor: default;" onclick="alert('Negotiation sent. Waiting for buyer...')">
                        <i class="fa-solid fa-clock"></i> Waiting...
                    </button>
                    `}
                    <button class="btn-reject" onclick="window.updateBidStatus('${bid.id}', 'Rejected')">
                        <i class="fa-solid fa-xmark"></i> Decline
                    </button>
                ` : `
                    <div style="text-align: center; width: 100%; color: #888; font-size: 0.85rem; padding: 10px; background: #f5f5f5; border-radius: 8px;">
                        <i class="fa-solid fa-folder-open"></i> Record archived in History
                    </div>
                `}
            </div>
        `;
        container.appendChild(card);
    });
}

function getStatusColor(status) {
    switch (status) {
        case 'Accepted': return '#2e7d32'; // Green
        case 'Rejected': return '#78909c'; // Gray
        case 'Counter-Offer': return '#fbc02d'; // Yellow/Gold
        default: return '#f57c00'; // Orange
    }
}

async function updateBidStatus(bidId, status) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this bid?`)) return;

    try {
        const { error } = await supabase
            .from('bids')
            .update({ status: status })
            .eq('id', bidId);

        if (error) throw error;

        // Notify Buyer
        const bid = bids.find(b => b.id === bidId);
        const farmerName = sessionStorage.getItem('kisansetu_user_name') || 'The farmer';

        await sendSystemNotification(
            bid.buyer_id,
            `Offer ${status}!`,
            `${farmerName} has ${status.toLowerCase()} your offer for ${bid.produce.crop_name}.`,
            status === 'Accepted' ? 'success' : 'warning'
        );

        alert(`Bid ${status} successfully! It has been moved to History.`);
        await loadBids(); 
    } catch (err) {
        alert("Action failed: " + err.message);
    }
}
window.updateBidStatus = updateBidStatus;

async function openCounterForm(bidId, currentPrice) {
    const newPrice = prompt("Enter your counter-offer price (per unit):", currentPrice);
    if (!newPrice || isNaN(newPrice) || parseFloat(newPrice) === currentPrice) return;

    try {
        const { error } = await supabase
            .from('bids')
            .update({ 
                bid_price: parseFloat(newPrice),
                status: 'Counter-Offer'
            })
            .eq('id', bidId);

        if (error) throw error;

        // Notify Buyer
        const bid = bids.find(b => b.id === bidId);
        const farmerName = sessionStorage.getItem('kisansetu_user_name') || 'The farmer';

        await sendSystemNotification(
            bid.buyer_id,
            'New Counter-Offer!',
            `${farmerName} sent a counter-offer of ₹${newPrice} for ${bid.produce.crop_name}. Check your offers!`,
            'info'
        );

        alert("Counter-offer sent successfully!");
        await loadBids();
    } catch (err) {
        alert("Failed to send counter: " + err.message);
    }
}
window.openCounterForm = openCounterForm;


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
