// ==========================================
// 1. MOCK ORDER DATA (For Presentation)
// ==========================================
const myOrders = [
    {
        id: "ORD-98234-A",
        item: "Wheat (Grade A)",
        seller: "Ramesh Singh (Kisan)",
        qty: "20 Quintals",
        totalAmount: "₹46,000",
        status: "in_transit",
        statusText: "In Transit",
        date: "Today, 10:30 AM",
        driver: { name: "Vikram Kumar", vehicle: "UP-32-AB-1234", phone: "tel:+919876543210" },
        timeline: [
            { title: "Order Confirmed", desc: "Seller accepted your order.", time: "Yesterday, 09:00 AM", status: "active" },
            { title: "Escrow Funded 🔒", desc: "Your ₹46,000 is safely held by KisanSetu.", time: "Yesterday, 09:15 AM", status: "active" },
            { title: "Vehicle Dispatched", desc: "Logistics partner picked up the crop.", time: "Today, 08:00 AM", status: "active" },
            { title: "In Transit", desc: "Truck is on the way to your location.", time: "Currently Active", status: "current" },
            { title: "Quality Check & Delivery", desc: "Pending weighbridge verification.", time: "Expected: Today, 04:00 PM", status: "pending" }
        ]
    },
    {
        id: "ORD-11092-B",
        item: "Urea Fertilizer (45kg)",
        seller: "AgroStore Direct",
        qty: "10 Bags",
        totalAmount: "₹2,660",
        status: "delivered",
        statusText: "Delivered",
        date: "Mar 25, 2026",
        driver: null,
        timeline: [
            { title: "Order Confirmed", desc: "", time: "Mar 23, 2026", status: "active" },
            { title: "Dispatched", desc: "Left the warehouse.", time: "Mar 24, 2026", status: "active" },
            { title: "Delivered", desc: "Handed over to you.", time: "Mar 25, 2026", status: "active" }
        ]
    }
];

// ==========================================
// 2. UI RENDERING LOGIC
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    renderOrders();
});

function renderOrders() {
    const activeContainer = document.getElementById('activeOrdersList');
    const pastContainer = document.getElementById('pastOrdersList');
    
    activeContainer.innerHTML = '';
    pastContainer.innerHTML = '';

    myOrders.forEach(order => {
        // Build Timeline HTML
        let timelineHTML = `<div class="timeline">`;
        order.timeline.forEach(step => {
            timelineHTML += `
                <div class="timeline-step ${step.status}">
                    <div class="step-title">${step.title}</div>
                    <div class="step-time">${step.time}</div>
                    ${step.desc ? `<div class="step-desc">${step.desc}</div>` : ''}
                </div>
            `;
        });
        timelineHTML += `</div>`;

        // Build Driver HTML (Only show if in transit)
        let driverHTML = '';
        if (order.driver) {
            driverHTML = `
                <div class="driver-card">
                    <div class="driver-info">
                        <div class="driver-avatar"><i class="fa-solid fa-truck"></i></div>
                        <div class="driver-details">
                            <h4>${order.driver.name}</h4>
                            <p>Vehicle: ${order.driver.vehicle}</p>
                        </div>
                    </div>
                    <a href="${order.driver.phone}" class="call-btn"><i class="fa-solid fa-phone"></i></a>
                </div>
            `;
        }

        // Action Buttons based on status
        let buttonsHTML = '';
        if (order.status === 'in_transit') {
            buttonsHTML = `
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" style="flex: 2; background-color: var(--primary-green);" onclick="alert('Opening Live GPS Tracking...')"><i class="fa-solid fa-map-location-dot"></i> Live Map</button>
                    <button class="btn-primary btn-outline" style="flex: 1;" onclick="openIssueModal('${order.id}')">Raise Issue</button>
                </div>
            `;
        } else {
            buttonsHTML = `
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary btn-outline" style="flex: 1;" onclick="alert('Downloading J-Form / Tax Invoice PDF...')"><i class="fa-solid fa-file-invoice"></i> Download Invoice</button>
                    <button class="btn-primary btn-outline" style="flex: 1;" onclick="alert('Reordering items...')">Buy Again</button>
                </div>
            `;
        }

        const badgeClass = order.status === 'in_transit' ? 'status-transit' : 'status-delivered';

        // Complete Card
        const cardHTML = `
            <div class="card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order ID: ${order.id}</div>
                        <h3 style="color: var(--charcoal); margin-top: 5px;">${order.item}</h3>
                    </div>
                    <span class="order-status-badge ${badgeClass}">${order.statusText}</span>
                </div>
                
                <p style="font-size: 0.9rem; color: var(--soil-brown); margin-bottom: 15px;">
                    <strong>Seller:</strong> ${order.seller} <br>
                    <strong>Quantity:</strong> ${order.qty} | <strong>Total:</strong> ${order.totalAmount}
                </p>

                ${driverHTML}
                ${timelineHTML}
                ${buttonsHTML}
            </div>
        `;

        if (order.status === 'in_transit') {
            activeContainer.innerHTML += cardHTML;
        } else {
            pastContainer.innerHTML += cardHTML;
        }
    });
}

// ==========================================
// 3. TAB & MODAL INTERACTIONS
// ==========================================

function switchTab(tabName) {
    document.getElementById('tabActive').classList.remove('active');
    document.getElementById('tabPast').classList.remove('active');
    document.getElementById('activeOrdersList').style.display = 'none';
    document.getElementById('pastOrdersList').style.display = 'none';

    if (tabName === 'active') {
        document.getElementById('tabActive').classList.add('active');
        document.getElementById('activeOrdersList').style.display = 'block';
    } else {
        document.getElementById('tabPast').classList.add('active');
        document.getElementById('pastOrdersList').style.display = 'block';
    }
}

function openIssueModal(orderId) {
    document.getElementById('issueOrderId').innerText = orderId;
    document.getElementById('issueModalOverlay').style.display = 'flex';
}

function closeIssueModal() {
    document.getElementById('issueModalOverlay').style.display = 'none';
}
