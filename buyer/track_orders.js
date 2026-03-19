// SRS State Machine: Placed -> Verified -> InTransit -> Delivered -> Processing (Escrow Released)
const STATUS_STAGES = ['Placed', 'Verified', 'InTransit', 'Delivered', 'Processing'];

// Mock LocalStorage Initialization
if (!localStorage.getItem('buyerOrders')) {
    const mockOrders = [
        {
            id: 'ORD-9923',
            crop: 'Wheat (Grade A)',
            qty: 50, // Quintals
            total: 120000,
            status: 'Delivered', // Ready for quality check
            date: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
        },
        {
            id: 'ORD-9945',
            crop: 'Potato (Kufri)',
            qty: 20,
            total: 30000,
            status: 'InTransit',
            date: new Date().toISOString()
        }
    ];
    localStorage.setItem('buyerOrders', JSON.stringify(mockOrders));
}

function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('buyerOrders'));
    const container = document.getElementById('orderList');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<div class="card"><p>No active orders.</p></div>';
        return;
    }

    orders.forEach((order, index) => {
        const currentStageIdx = STATUS_STAGES.indexOf(order.status);
        const isDelivered = order.status === 'Delivered';
        const isSettled = order.status === 'Processing';

        // Generate Stepper HTML
        let timelineHTML = '<ul class="timeline">';
        STATUS_STAGES.forEach((stage, i) => {
            // Don't show "Processing" in the standard timeline until it happens
            if (stage === 'Processing' && !isSettled) return; 
            
            let liClass = 'timeline-step';
            if (i < currentStageIdx || isSettled) liClass += ' completed';
            if (i === currentStageIdx && !isSettled) liClass += ' active';

            let displayStage = stage;
            if (stage === 'Processing') displayStage = 'Quality Confirmed (Escrow Released)';

            timelineHTML += `
                <li class="${liClass}">
                    <div class="step-dot"></div>
                    <span class="step-text">${displayStage}</span>
                </li>
            `;
        });
        timelineHTML += '</ul>';

        // Build Card
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="order-header">
                <div>
                    <strong>${order.crop}</strong>
                    <div class="order-id">${order.id} • ${order.qty} Quintals</div>
                </div>
                <div class="order-total">₹${order.total.toLocaleString('en-IN')}</div>
            </div>
            
            ${timelineHTML}

            <div style="margin-top: 15px; display: flex; gap: 10px;">
                ${isDelivered ? `<button class="btn-primary" onclick="confirmQuality(${index})">✅ Confirm Quality (Release Funds)</button>` : ''}
                <button class="btn-primary btn-secondary" onclick="downloadInvoice('${order.id}')">📄 Invoice</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// SRS FR-3.4 / State Transition Table Action
function confirmQuality(orderIndex) {
    if(confirm("Confirming quality will release escrow funds to the farmer. Proceed?")) {
        const orders = JSON.parse(localStorage.getItem('buyerOrders'));
        orders[orderIndex].status = 'Processing'; // Triggers Payment Settlement in backend
        localStorage.setItem('buyerOrders', JSON.stringify(orders));
        loadOrders(); // Re-render
        alert("Escrow funds released via UPI/Bank transfer.");
    }
}

function downloadInvoice(orderId) {
    alert(`Downloading digital invoice for ${orderId}...`);
}

// Initialize
loadOrders();