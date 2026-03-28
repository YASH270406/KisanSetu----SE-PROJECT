// payment_status.js
const mockOrders = [
    { orderId: 'ORD-9021', crop: 'Wheat', amount: 125000, status: 'Delivered', date: '2026-03-21T10:30:00Z' },
    { orderId: 'ORD-8810', crop: 'Potato', amount: 45000, status: 'Settled', date: '2026-03-15T14:20:00Z' }
];

window.onload = () => {
    loadPayments();
};

function loadPayments() {
    let orders = JSON.parse(localStorage.getItem('kisansetu_orders'));
    if (!orders || orders.length === 0) {
        orders = mockOrders;
        localStorage.setItem('kisansetu_orders', JSON.stringify(orders));
    }

    // Filter to only show Escrow related statuses
    const paymentOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Settled');
    renderPayments(paymentOrders);
}

function renderPayments(orders) {
    const container = document.getElementById('payments-container');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No completed or processing transactions found.</p>';
        return;
    }

    orders.forEach(order => {
        // Map SRS Status to Escrow UI State
        const isSettled = order.status === 'Settled';
        const cardClass = isSettled ? 'status-settled' : 'status-processing';
        const escrowText = isSettled ? '<i class="fa-solid fa-check-circle"></i> Funds Settled' : '<i class="fa-solid fa-clock"></i> Escrow Processing';
        const formattedDate = new Date(order.date).toLocaleString();

        const card = document.createElement('div');
        card.className = `payment-card ${cardClass}`;
        card.innerHTML = `
            <div class="flex-between">
                <div>
                    <strong>${order.crop} Sale</strong>
                    <div style="font-size: 0.8rem; color: #666;">Order: ${order.orderId}</div>
                </div>
                <div class="amount">₹${order.amount.toLocaleString('en-IN')}</div>
            </div>
            <div class="flex-between" style="margin-top: 10px;">
                <span class="escrow-badge">${escrowText}</span>
                <span style="font-size: 0.75rem; color: #888;">${formattedDate}</span>
            </div>
            <button class="btn-download" onclick="downloadInvoice('${order.orderId}')">
                <i class="fa-solid fa-file-invoice"></i> Download Invoice
            </button>
        `;
        container.appendChild(card);
    });
}

function downloadInvoice(orderId) {
    // REPLACED ALERT WITH SHARED TOAST
    showToast(`Generating PDF Invoice for ${orderId}...`, 'info');
}