// --- KisanSetu | Centralized Notification Manager ---

// 1. Role Detection & User Context
const getCurrentUser = () => {
    const mobile = localStorage.getItem('kisan_current_login') || '9999999999'; // Fallback to demo farmer
    const users = JSON.parse(localStorage.getItem('kisan_registered_users')) || {};
    
    // Hardcode demo accounts if not present
    if (!users['9999999999']) users['9999999999'] = { name: "Demo Farmer", role: "Farmer" };
    if (!users['8888888888']) users['8888888888'] = { name: "Demo Buyer", role: "Buyer" };

    return users[mobile] || users['9999999999'];
};

// 2. Base "Real" Notifications by Role
const roleNotifications = {
    'Farmer': [
        {
            id: 'f_notif_1',
            type: 'Order',
            title: 'New Bid Received!',
            desc: 'SevaMart Wholesale offered ₹2350/q for your Wheat (50 Qtl).',
            time: '2 hours ago',
            icon: 'fa-handshake',
            unread: true
        },
        {
            id: 'f_notif_2',
            type: 'Payment',
            title: 'Payment Credited',
            desc: '₹12,500 has been credited to your wallet for Wheat batch #402.',
            time: '5 hours ago',
            icon: 'fa-circle-check',
            unread: true
        },
        {
            id: 'f_notif_3',
            type: 'Price',
            title: 'Market Trend Update',
            desc: 'Wheat prices in Akbarpur Mandi are up by 2% today.',
            time: '1 day ago',
            icon: 'fa-chart-line',
            unread: false
        }
    ],
    'Buyer': [
        {
            id: 'b_notif_1',
            type: 'Order',
            title: 'Bid Accepted!',
            desc: 'Farmer Yash accepted your offer of ₹2400/q for Wheat.',
            time: '1 hour ago',
            icon: 'fa-thumbs-up',
            unread: true
        },
        {
            id: 'b_notif_2',
            type: 'Order',
            title: 'Order Dispatched',
            desc: 'Your order #882 (Tomatoes) from Farmer Amit is in transit.',
            time: '3 hours ago',
            icon: 'fa-truck-fast',
            unread: true
        },
        {
            id: 'b_notif_3',
            type: 'Price',
            title: 'Price Drop Alert',
            desc: 'Potato prices dropped by ₹100/q. Good time to buy!',
            time: 'Yesterday',
            icon: 'fa-tags',
            unread: false
        }
    ],
    'Equipment Owner': [
        {
            id: 'e_notif_1',
            type: 'Booking',
            title: 'New Booking Request',
            desc: 'Farmer Ramesh requested Mahindra Tractor for 2 days (15-16 Oct).',
            time: '30 mins ago',
            icon: 'fa-calendar-plus',
            unread: true
        },
        {
            id: 'e_notif_2',
            type: 'Booking',
            title: 'Equipment Returned',
            desc: 'Seed Drill returned by Farmer Amit. Inspect for next rental.',
            time: '4 hours ago',
            icon: 'fa-rotate-left',
            unread: true
        },
        {
            id: 'e_notif_3',
            type: 'Payment',
            title: 'Rental Payout',
            desc: '₹4,200 payout for Harvester rental #992 is processed.',
            time: '2 days ago',
            icon: 'fa-wallet',
            unread: false
        }
    ]
};

// 3. Notification State Management
let currentFilter = 'all';
let notifications = [];

const loadNotifications = () => {
    const user = getCurrentUser();
    const role = user.role.includes('Farmer') ? 'Farmer' : 
                 user.role.includes('Buyer') ? 'Buyer' : 'Equipment Owner';
    
    const saved = localStorage.getItem(`kisansetu_notifs_${role}`);
    if (saved) {
        notifications = JSON.parse(saved);
    } else {
        notifications = roleNotifications[role] || [];
        saveNotifications(role);
    }
};

const saveNotifications = (role) => {
    const user = getCurrentUser();
    const activeRole = role || (user.role.includes('Farmer') ? 'Farmer' : 
                               user.role.includes('Buyer') ? 'Buyer' : 'Equipment Owner');
    localStorage.setItem(`kisansetu_notifs_${activeRole}`, JSON.stringify(notifications));
};

// 4. UI Rendering
const renderNotifications = () => {
    const listElement = document.getElementById('notifications-list');
    const emptyState = document.getElementById('empty-state');
    
    const filtered = currentFilter === 'all' 
        ? notifications 
        : notifications.filter(n => n.type === currentFilter);

    if (filtered.length === 0) {
        listElement.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        listElement.innerHTML = filtered.map(n => `
            <div class="notif-card ${n.unread ? 'unread' : ''}" onclick="markAsRead('${n.id}')">
                <div class="notif-icon ${n.type.toLowerCase()}">
                    <i class="fa-solid ${n.icon}"></i>
                </div>
                <div class="notif-content">
                    <h4 class="notif-title">${n.title}</h4>
                    <p class="notif-desc">${n.desc}</p>
                    <span class="notif-time">${n.time}</span>
                </div>
                ${n.unread ? '<div class="unread-dot"></div>' : ''}
            </div>
        `).join('');
    }
};

// 5. Actions
function filterNotifications(type) {
    currentFilter = type;
    
    // Update active chip UI
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        if (chip.textContent.toLowerCase().includes(type.toLowerCase()) || (type === 'all' && chip.textContent === 'All')) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    renderNotifications();
}

function markAsRead(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.unread = false;
        saveNotifications();
        renderNotifications();
    }
}

function markAllAsRead() {
    notifications.forEach(n => n.unread = false);
    saveNotifications();
    renderNotifications();
}

function goBack() {
    const user = getCurrentUser();
    if (user.role.includes('Farmer')) {
        window.location.href = '../farmer/farmer_dashboard.html';
    } else if (user.role.includes('Buyer')) {
        window.location.href = '../buyer/buyer_dashboard.html';
    } else {
        window.location.href = '../equipment_owner/equipment_dashboard.html';
    }
}

// 6. Init
window.onload = () => {
    loadNotifications();
    renderNotifications();
};
