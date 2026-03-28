// ─── KisanSetu | Buyer Bids & Offers ───────────────────────────────

const fallbackMockBids = [
    {
        bidId:        'bid_001',
        buyerName:    'SevaMart Wholesale',
        buyerInitials:'SW',
        crop:         'Wheat',
        qty:          50,
        unit:         'Quintal',
        askingPrice:  2500,
        offeredPrice: 2350,
        listingId:    'listing_101',
        timeAgo:      '2 hours ago',
        status:       'Pending'
    },
    {
        bidId:        'bid_002',
        buyerName:    'SevaMart Wholesale',
        buyerInitials:'SW',
        crop:         'Tomato',
        qty:          10,
        unit:         'Quintal',
        askingPrice:  1200,
        offeredPrice: 1100,
        listingId:    'listing_103',
        timeAgo:      '2 days ago',
        status:       'Countered',
        counterPrice: 1150
    }
];

let myBids = [];

function loadBids() {
    const saved = localStorage.getItem('kisansetu_bids');
    if (saved) {
        try {
            myBids = JSON.parse(saved);
        } catch (e) {
            myBids = [...fallbackMockBids];
            saveBids();
        }
    } else {
        myBids = [...fallbackMockBids];
        saveBids();
    }
}

function saveBids() {
    localStorage.setItem('kisansetu_bids', JSON.stringify(myBids));
}

function buildBidCard(bid) {
    const totalValue = (bid.qty * bid.offeredPrice).toLocaleString('en-IN');
    const isActionable = (bid.status === 'Countered');
    const statusClass  = 'status-' + bid.status.toLowerCase();
    const cardClass    = (bid.status === 'Rejected' || bid.status === 'Disabled')
        ? 'bid-card rejected'
        : 'bid-card';

    let actionsHTML = '';
    let counterInfoHTML = '';

    if (bid.status === 'Countered' && bid.counterPrice) {
        const counterTotal = (bid.qty * bid.counterPrice).toLocaleString('en-IN');
        counterInfoHTML = `
            <div class="detail-row highlight" style="color: #f57f17; background: #fffde7; margin-top: 5px; padding: 5px;">
                <span class="detail-label"><i class="fa-solid fa-code-compare"></i> Farmer Counter</span>
                <span class="detail-value">₹${bid.counterPrice.toLocaleString('en-IN')} / ${bid.unit}</span>
            </div>
            <div class="detail-row" style="background: #fffde7; padding: 0 5px 5px 5px;">
                <span class="detail-label">New deal value</span>
                <span class="detail-value total-value" style="color:#d32f2f">₹${counterTotal}</span>
            </div>
        `;

        actionsHTML = `
            <div class="bid-actions" style="margin-top:15px;">
                <button class="btn-accept" onclick="acceptCounter('${bid.bidId}')">
                    <i class="fa-solid fa-check"></i> Accept Counter
                </button>
                <button class="btn-reject" onclick="declineCounter('${bid.bidId}')">
                    <i class="fa-solid fa-xmark"></i> Decline
                </button>
            </div>
        `;
    }

    return `
    <div class="${cardClass}" id="card-${bid.bidId}">
        <div class="bid-card-header">
            <div class="buyer-info">
                <div class="buyer-avatar" style="background:#4caf50"><i class="fa-solid fa-leaf" style="color:#fff"></i></div>
                <div>
                    <h4 class="buyer-name">Farmer Listing</h4>
                    <p class="bid-time">${bid.timeAgo}</p>
                </div>
            </div>
            <span class="status-badge ${statusClass}">${bid.status}</span>
        </div>

        <div class="bid-details">
            <div class="detail-row">
                <span class="detail-label">Crop</span>
                <span class="detail-value">${bid.crop}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Quantity</span>
                <span class="detail-value">${bid.qty} ${bid.unit}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Asking price</span>
                <span class="detail-value">₹${bid.askingPrice.toLocaleString('en-IN')} / ${bid.unit}</span>
            </div>
            <div class="detail-row highlight">
                <span class="detail-label">Your offer</span>
                <span class="detail-value offer-price">₹${bid.offeredPrice.toLocaleString('en-IN')} / ${bid.unit}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Original total</span>
                <span class="detail-value total-value">₹${totalValue}</span>
            </div>
            ${counterInfoHTML}
        </div>
        ${actionsHTML}
    </div>`;
}

function renderBids() {
    const container  = document.getElementById('bids-container');
    const emptyMsg   = document.getElementById('empty-msg');
    const countBadge = document.getElementById('bid-count');

    // Only show bids that belong to "SevaMart Wholesale" for realism, or just show all for demo
    const displayBids = myBids.filter(b => b.buyerName === 'SevaMart Wholesale' || !b.buyerName);

    const pendingCount = displayBids.filter(b => b.status === 'Pending' || b.status === 'Countered').length;

    if (pendingCount > 0) {
        countBadge.textContent = pendingCount;
        countBadge.style.display = 'inline-block';
    } else {
        countBadge.style.display = 'none';
    }

    if (displayBids.length === 0) {
        container.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';
    container.innerHTML = displayBids.map(bid => buildBidCard(bid)).join('');
}

function acceptCounter(bidId) {
    if(confirm("Accept the farmer's counter offer? This will finalize the deal.")) {
        const bid = myBids.find(b => b.bidId === bidId);
        if(bid) {
            bid.status = 'Accepted';
            bid.offeredPrice = bid.counterPrice; // Update the final deal price
            saveBids();
            renderBids();
            alert("Deal Accepted! The order has been moved to Track Orders.");
        }
    }
}

function declineCounter(bidId) {
    if(confirm("Decline this counter offer? The bid will be rejected.")) {
        const bid = myBids.find(b => b.bidId === bidId);
        if(bid) {
            bid.status = 'Rejected';
            saveBids();
            renderBids();
        }
    }
}

window.onload = function () {
    loadBids();
    renderBids();
};
