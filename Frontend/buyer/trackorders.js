// SRS State Machine: Placed -> Confirmed -> InTransit -> Delivered -> Settled (Escrow Released)
const STATUS_STAGES = ['Placed', 'Confirmed', 'InTransit', 'Delivered', 'Settled'];

// Mock LocalStorage Initialization
if (!localStorage.getItem('kisansetu_orders')) {
    const mockOrders = [
        {
            orderId: 'ORD-9923',
            crop: 'Wheat (Grade A)',
            qty: 50, // Quintals
            totalAmount: 120000,
            status: 'Delivered', // Ready for quality check
            date: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
        },
        {
            orderId: 'ORD-9945',
            crop: 'Potato (Kufri)',
            qty: 20,
            totalAmount: 30000,
            status: 'InTransit',
            date: new Date().toISOString()
        }
    ];
    localStorage.setItem('kisansetu_orders', JSON.stringify(mockOrders));
}

function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('kisansetu_orders')) || [];
    const container = document.getElementById('orderList');
    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<div class="card"><p>No active orders.</p></div>';
        return;
    }

    orders.forEach((order, index) => {
        const currentStageIdx = STATUS_STAGES.indexOf(order.status);
        const isDelivered = order.status === 'Delivered';
        const isSettled = order.status === 'Settled';
        let timelineHTML = '';
        if (order.status === 'Cancelled') {
            timelineHTML = `
                <div style="background: rgba(211, 47, 47, 0.08); border-left: 5px solid #d32f2f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <strong style="color: #d32f2f; font-size: 1.1rem;"><i class="fa-solid fa-ban"></i> Order Cancelled</strong>
                    <p style="margin: 5px 0 0; color: #555; font-size: 0.9rem;">This order was cancelled and funds have been refunded.</p>
                </div>
            `;
        } else {
            timelineHTML = '<ul class="timeline">';
            STATUS_STAGES.forEach((stage, i) => {
                let liClass = 'timeline-step';
                
                if (i < currentStageIdx || (i === currentStageIdx && isSettled)) liClass += ' completed';
                if (i === currentStageIdx && !isSettled) liClass += ' active';

                let displayStage = stage;
                if (stage === 'Settled') displayStage = 'Payment Settled (Escrow Released)';
                if (stage === 'InTransit') displayStage = 'In Transit';

                timelineHTML += `
                    <li class="${liClass}">
                        <div class="step-dot"></div>
                        <span class="step-text">${displayStage}</span>
                    </li>
                `;
            });
            timelineHTML += '</ul>';
        }

        // Build Card
        const card = document.createElement('div');
        card.className = 'card glass-card';
        const canCancel = order.status !== 'Cancelled';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(46,125,50,0.1); padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <strong style="font-size: 1.25rem; color: var(--primary-green); letter-spacing: -0.5px;">${order.crop}</strong>
                    <div style="color: var(--soil-brown); font-size: 0.9rem; margin-top: 5px;">${order.orderId} &bull; ${order.qty} Quintals &bull; Date: ${(new Date(order.date)).toLocaleDateString()}</div>
                </div>
                <div style="font-size: 1.4rem; font-weight: 700; color: var(--charcoal);">₹${(order.totalAmount || order.total || order.amount || 0).toLocaleString('en-IN')}</div>
            </div>
            
            ${timelineHTML}

            <div style="margin-top: 25px; display: flex; gap: 15px; flex-direction: column;">
                ${isDelivered ? `<button class="btn-primary" onclick="confirmQuality(${index})"><i class="fa-solid fa-check-circle"></i> Confirm Quality (Release Funds)</button>` : ''}
                ${canCancel ? `<button class="btn-primary" style="background: #fff; color: #d32f2f; border: 1px solid #d32f2f; box-shadow: none;" onclick="cancelOrder('${order.orderId}')"><i class="fa-solid fa-times-circle"></i> Cancel Order</button>` : ''}
                ${order.status !== 'Cancelled' ? `<button class="btn-primary btn-secondary" onclick="downloadInvoice('${order.orderId}')" style="margin-bottom: 0;"><i class="fa-solid fa-file-invoice"></i> Download Invoice</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

// SRS FR-3.4 / State Transition Table Action
function confirmQuality(orderIndex) {
    if(confirm("Confirming quality will release escrow funds to the farmer. Proceed?")) {
        const orders = JSON.parse(localStorage.getItem('kisansetu_orders'));
        orders[orderIndex].status = 'Settled'; // Triggers Payment Settlement in backend
        localStorage.setItem('kisansetu_orders', JSON.stringify(orders));
        loadOrders(); // Re-render
        alert("Escrow funds released via UPI/Bank transfer.");
    }
}

function cancelOrder(orderId) {
    if(confirm("Are you sure you want to cancel this order? Escrow funds will be refunded to your account.")) {
        const orders = JSON.parse(localStorage.getItem('kisansetu_orders'));
        const orderIdx = orders.findIndex(o => o.orderId === orderId);
        
        if (orderIdx > -1) {
            orders[orderIdx].status = 'Cancelled';
            localStorage.setItem('kisansetu_orders', JSON.stringify(orders));
            loadOrders(); // Re-render instantly
            alert("Order Cancelled successfully.");
        }
    }
}

function downloadInvoice(orderId) {
    const orders = JSON.parse(localStorage.getItem('kisansetu_orders'));
    const order = orders.find(o => o.orderId === orderId);
    if(!order) return;

    const invoiceHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>KisanSetu Invoice - ${order.orderId}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; padding: 40px; color: #333; }
        .invoice-box { max-width: 800px; margin: auto; padding: 40px; border: 1px solid #e1e8ed; background: #fff; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border-radius: 12px;}
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2e7d32; padding-bottom: 25px; margin-bottom: 30px; }
        .header h1 { color: #2e7d32; margin: 0; font-size: 2.2rem; }
        .header h2 { color: #555; margin: 0; font-size: 1.5rem; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-box { background: #f9fbe7; padding: 15px; border-radius: 8px; border-left: 4px solid #8bc34a; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #e1e8ed; }
        th { background-color: #f1f8e9; color: #2e7d32; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; }
        .total-row td { font-size: 1.2rem; font-weight: bold; color: #1b5e20; background-color: #f1f8e9; border-top: 2px solid #2e7d32; }
        .footer { text-align: center; margin-top: 50px; color: #777; font-size: 0.9rem; border-top: 1px solid #eee; padding-top: 20px;}
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div>
                <h1>KisanSetu</h1>
                <p style="margin: 5px 0; color: #666;">National Agricultural Trading Platform</p>
                <p style="margin: 5px 0; color: #666;">New Delhi, India</p>
            </div>
            <div style="text-align: right;">
                <h2>INVOICE</h2>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
                <p style="display:inline-block; margin-top: 10px; padding: 5px 15px; background: #e8f5e9; color: #2e7d32; border-radius: 20px; font-weight: 600;">Status: ${order.status}</p>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <strong>Billed To:</strong><br>
                Buyer Dashboard User<br>
                Verified Buyer Account
            </div>
            <div class="info-box">
                <strong>Payment Details:</strong><br>
                Escrow Service via UPI<br>
                Transaction Ref: KISAN-${Math.floor(Math.random() * 1000000)}
            </div>
        </div>

        <table>
            <tr>
                <th>Commodity Details</th>
                <th>Quantity</th>
                <th>Rate/Quintal</th>
                <th style="text-align: right;">Total Amount</th>
            </tr>
            <tr>
                <td><strong>${order.crop}</strong><br><small>Premium Grade</small></td>
                <td>${order.qty} Quintals</td>
                <td>₹${Math.round((order.totalAmount || order.total || order.amount || 0) / order.qty).toLocaleString('en-IN')}</td>
                <td style="text-align: right;">₹${(order.totalAmount || order.total || order.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr class="total-row">
                <td colspan="3" style="text-align: right;">Grand Total (Paid via Escrow):</td>
                <td style="text-align: right;">₹${(order.totalAmount || order.total || order.amount || 0).toLocaleString('en-IN')}</td>
            </tr>
        </table>

        <div class="footer">
            <p>Thank you for trading on KisanSetu!</p>
            <p><small>This is a system-generated electronic invoice and does not require a physical signature.</small></p>
        </div>
    </div>
</body>
</html>`;

    // Create a Blob from the HTML and download it
    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice_${order.orderId}.html`;
    link.click();
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

// Initialize
loadOrders();
