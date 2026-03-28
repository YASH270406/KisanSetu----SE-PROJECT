// my_listings.js
const mockFarmerListings = [
    { id: 'LST-001', crop: 'Wheat', variety: 'Sharbati', qty: 50, unit: 'Quintal', price: 2500, status: 'Draft', date: '2026-03-20' },
    { id: 'LST-002', crop: 'Tomato', variety: 'Hybrid', qty: 20, unit: 'Quintal', price: 1500, status: 'Listed', date: '2026-03-18' },
    { id: 'LST-003', crop: 'Potato', variety: 'Desi', qty: 100, unit: 'Quintal', price: 1100, status: 'Negotiation', date: '2026-03-15', hasBids: true },
    { id: 'LST-004', crop: 'Onion', variety: 'Red', qty: 30, unit: 'Quintal', price: 1800, status: 'Locked', date: '2026-03-10' },
    { id: 'LST-005', crop: 'Paddy', variety: 'Basmati', qty: 0, unit: 'Quintal', price: 3200, status: 'Settled', date: '2026-02-28' }
];

window.onload = () => {
    loadListings();
};

function loadListings() {
    // Read from localStorage or fallback to mock
    let listings = JSON.parse(localStorage.getItem('kisansetu_listings'));
    if (!listings || listings.length === 0) {
        listings = mockFarmerListings;
        localStorage.setItem('kisansetu_listings', JSON.stringify(listings));
    }
    renderListings(listings);
}

function renderListings(listings) {
    const container = document.getElementById('listings-container');
    container.innerHTML = '';

    if (listings.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">You have no active listings.</p>';
        return;
    }

    listings.forEach(item => {
        const badgeClass = `badge-${item.status.toLowerCase()}`;

        // Buttons logic per SRS
        let buttonsHtml = '';
        if (item.status === 'Draft') {
            buttonsHtml += `<button class="btn btn-edit" onclick="editListing('${item.id}')"><i class="fa-solid fa-pen"></i> Edit</button>`;
            buttonsHtml += `<button class="btn btn-delete" onclick="deleteListing('${item.id}')"><i class="fa-solid fa-trash"></i> Delete</button>`;
        }
        if (item.status === 'Negotiation' || item.hasBids) {
            buttonsHtml += `<a href="bid.html" class="btn btn-bids"><i class="fa-solid fa-handshake"></i> View Bids</a>`;
        }

        const card = document.createElement('div');
        card.className = 'listing-card';
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="crop-title">${item.crop} (${item.variety})</div>
                    <div class="crop-qty">Qty: ${item.qty} ${item.unit} ${item.status === 'Settled' ? '(Auto-decremented)' : ''}</div>
                </div>
                <span class="badge ${badgeClass}">${item.status}</span>
            </div>
            <div class="details">
                <p><strong>Asking Price:</strong> <span class="price">₹${item.price} / ${item.unit}</span></p>
                <p><strong>Listed On:</strong> ${item.date}</p>
                <p><strong>Listing ID:</strong> <small style="color:#888;">${item.id}</small></p>
            </div>
            ${buttonsHtml ? `<div class="actions">${buttonsHtml}</div>` : ''}
        `;
        container.appendChild(card);
    });
}

function deleteListing(id) {
    // Keeping confirm() as it requires user interaction, 
    // but using showToast for the result.
    if (confirm('Are you sure you want to delete this draft?')) {
        let listings = JSON.parse(localStorage.getItem('kisansetu_listings'));
        listings = listings.filter(l => l.id !== id);
        localStorage.setItem('kisansetu_listings', JSON.stringify(listings));
        loadListings();
        showToast('Listing draft deleted.', 'info');
    }
}

function editListing(id) {
    // REPLACED ALERT WITH SHARED TOAST
    showToast('Redirecting to Edit Listing wizard...', 'info');
}