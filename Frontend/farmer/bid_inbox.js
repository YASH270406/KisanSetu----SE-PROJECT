// ─── KisanSetu | Bid Inbox — Mock Data + Render ───────────────────────────────

// Mock incoming bids from buyers
// In production this would be fetched from POST /api/bids?farmer_id=X
const mockBids = [
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
        buyerName:    'FreshMart Retail',
        buyerInitials:'FR',
        crop:         'Wheat',
        qty:          30,
        unit:         'Quintal',
        askingPrice:  2500,
        offeredPrice: 2420,
        listingId:    'listing_101',
        timeAgo:      '5 hours ago',
        status:       'Pending'
    },
    {
        bidId:        'bid_003',
        buyerName:    'Anaj Traders',
        buyerInitials:'AT',
        crop:         'Rice',
        qty:          20,
        unit:         'Quintal',
        askingPrice:  2100,
        offeredPrice: 2050,
        listingId:    'listing_102',
        timeAgo:      'Yesterday',
        status:       'Pending'
    },
    {
        bidId:        'bid_004',
        buyerName:    'Delhi Mandi Corp',
        buyerInitials:'DM',
        crop:         'Tomato',
        qty:          10,
        unit:         'Quintal',
        askingPrice:  1200,
        offeredPrice: 1100,
        listingId:    'listing_103',
        timeAgo:      '2 days ago',
        status:       'Pending'
    }
];

// Load bids from localStorage if available (persists across page refreshes)
function loadBids() {
    const saved = localStorage.getItem('kisansetu_bids');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge: keep mock bids not already in saved, plus saved bids
            parsed.forEach(savedBid => {
                const idx = mockBids.findIndex(b => b.bidId === savedBid.bidId);
                if (idx !== -1) {
                    mockBids[idx] = savedBid; // update status from saved
                }
            });
        } catch (e) {
            // If parse fails, just use mockBids as-is
        }
    }
}

function saveBids() {
    localStorage.setItem('kisansetu_bids', JSON.stringify(mockBids));
}

// ── Build one bid card HTML string ────────────────────────────────────────────
function buildBidCard(bid) {
    const totalValue = (bid.qty * bid.offeredPrice).toLocaleString('en-IN');
    const isActionable = (bid.status === 'Pending');
    const statusClass  = 'status-' + bid.status.toLowerCase();
    const cardClass    = bid.status !== 'Pending'
        ? 'bid-card ' + bid.status.toLowerCase()
        : 'bid-card';

    // Show counter form only if status is Pending
    const counterFormHTML = isActionable ? `
        <div class="counter-form" id="counter-${bid.bidId}" style="display:none">
            <label>Your counter price (₹ per ${bid.unit})</label>
            <div class="counter-input-row">
                <span class="currency-sym">₹</span>
                <input type="number" id="counter-val-${bid.bidId}"
                       placeholder="e.g. ${bid.askingPrice - 50}" min="1">
                <button onclick="submitCounter('${bid.bidId}')">Send</button>
            </div>
        </div>` : '';

    // Disable buttons if not Pending
    const disabled = isActionable ? '' : 'disabled';

    return `
    <div class="${cardClass}" id="card-${bid.bidId}">
        <div class="bid-card-header">
            <div class="buyer-info">
                <div class="buyer-avatar">${bid.buyerInitials}</div>
                <div>
                    <h4 class="buyer-name">${bid.buyerName}</h4>
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
                <span class="detail-label">Your asking price</span>
                <span class="detail-value">₹${bid.askingPrice.toLocaleString('en-IN')} / ${bid.unit}</span>
            </div>
            <div class="detail-row highlight">
                <span class="detail-label">Buyer's offer</span>
                <span class="detail-value offer-price">₹${bid.offeredPrice.toLocaleString('en-IN')} / ${bid.unit}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total deal value</span>
                <span class="detail-value total-value">₹${totalValue}</span>
            </div>
        </div>

        <div class="bid-actions">
            <button class="btn-accept"  ${disabled} onclick="acceptBid('${bid.bidId}')">
                <i class="fa-solid fa-check"></i> Accept
            </button>
            <button class="btn-reject"  ${disabled} onclick="rejectBid('${bid.bidId}')">
                <i class="fa-solid fa-xmark"></i> Reject
            </button>
            <button class="btn-counter" ${disabled} onclick="counterOffer('${bid.bidId}')">
                <i class="fa-solid fa-rotate"></i> Counter
            </button>
        </div>

        ${counterFormHTML}
    </div>`;
}

// ── Render all bids into the container ────────────────────────────────────────
function renderBids() {
    const container  = document.getElementById('bids-container');
    const emptyMsg   = document.getElementById('empty-msg');
    const countBadge = document.getElementById('bid-count');

    // Count how many are still Pending
    const pendingCount = mockBids.filter(b => b.status === 'Pending').length;

    // Update the header badge
    if (pendingCount > 0) {
        countBadge.textContent = pendingCount;
        countBadge.classList.remove('hidden');
    } else {
        countBadge.classList.add('hidden');
    }

    if (mockBids.length === 0) {
        container.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';
    container.innerHTML = mockBids.map(bid => buildBidCard(bid)).join('');
}

// ── Business Logic — State Machine ───────────────────────────────────────────
// Per SRS State Transition Table:
// Negotiation + Farmer accepts price  → Locked   (reserve stock, disable other bids)
// Negotiation + Farmer rejects bid    → Listed    (reopen listing, notify buyer)
// Pending     + Farmer counter-offers → Countered (new price sent to buyer)

function acceptBid(bidId) {
    const bid = mockBids.find(b => b.bidId === bidId);
    if (!bid || bid.status !== 'Pending') return;

    // Set this bid to Accepted
    bid.status = 'Accepted';

    // Disable all other bids on the SAME listing (per SRS: reserve stock)
    mockBids.forEach(b => {
        if (b.listingId === bid.listingId && b.bidId !== bidId && b.status === 'Pending') {
            b.status = 'Disabled';
        }
    });

    saveBids();
    renderBids();
    showToast(
        `Bid accepted! ₹${bid.offeredPrice.toLocaleString('en-IN')}/${bid.unit} from ${bid.buyerName}. Listing is now Locked.`,
        'success'
    );
}

function rejectBid(bidId) {
    const bid = mockBids.find(b => b.bidId === bidId);
    if (!bid || bid.status !== 'Pending') return;

    // Set to Rejected — listing goes back to Listed (buyer notified via toast)
    bid.status = 'Rejected';

    saveBids();
    renderBids();
    showToast(
        `Bid from ${bid.buyerName} rejected. Your listing is back to open.`,
        'info'
    );
}

function counterOffer(bidId) {
    // Toggle the counter-offer input form visibility
    const form = document.getElementById('counter-' + bidId);
    if (!form) return;
    const isVisible = form.style.display !== 'none';
    form.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        // Focus the input when opened
        document.getElementById('counter-val-' + bidId).focus();
    }
}

function submitCounter(bidId) {
    const input      = document.getElementById('counter-val-' + bidId);
    const counterVal = parseInt(input.value, 10);
    const bid        = mockBids.find(b => b.bidId === bidId);

    if (!bid) return;

    if (!counterVal || counterVal <= 0) {
        showToast('Please enter a valid counter price.', 'error');
        return;
    }

    if (counterVal <= bid.offeredPrice) {
        showToast('Counter price must be higher than the buyer\'s offer.', 'error');
        return;
    }

    // Save counter price and update status
    bid.counterPrice = counterVal;
    bid.status       = 'Countered';

    saveBids();
    renderBids();
    showToast(
        `Counter-offer of ₹${counterVal.toLocaleString('en-IN')}/${bid.unit} sent to ${bid.buyerName}.`,
        'success'
    );
}

// ── Toast utility (inline — will be replaced by shared/toast.js later) ────────
function showToast(message, type) {
    const existing = document.getElementById('ks-toast');
    if (existing) existing.remove();

    const colors = {
        success: '#2e7d32',
        error:   '#d32f2f',
        info:    '#1565c0'
    };

    const toast = document.createElement('div');
    toast.id    = 'ks-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: #fff;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 0.82rem;
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
        z-index: 9999;
        max-width: 85%;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ── Initialise ────────────────────────────────────────────────────────────────
window.onload = function () {
    loadBids();
    renderBids();
};