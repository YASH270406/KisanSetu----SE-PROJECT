// Frontend/equipment_owner/booking_requests.js
import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let currentMode = 'Pending';
let allRequests = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth
    await initializeDashboard('Equipment Owner');

    // 2. Load Requests
    await loadRequests('Pending');
});

async function loadRequests(mode = 'Pending') {
    currentMode = mode;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Step 1: Get owner's equipment IDs
        const { data: myEquip } = await supabase
            .from('equipment')
            .select('id')
            .eq('owner_id', user.id);
        
        const equipIds = myEquip.map(e => e.id);

        if (equipIds.length === 0) {
            renderRequests([]);
            return;
        }

        // Step 2: Fetch bookings for these assets
        let query = supabase
            .from('bookings')
            .select(`
                *,
                equipment:equipment_id (name, hourly_rate),
                farmer:farmer_id (full_name)
            `)
            .in('equipment_id', equipIds);

        if (mode === 'Pending') {
            query = query.eq('status', 'Pending');
        } else {
            query = query.neq('status', 'Pending');
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        allRequests = data;
        renderRequests(allRequests);
    } catch (err) {
        console.error("Error loading requests:", err);
    }
}

function renderRequests(requests) {
    const grid = document.getElementById('request-grid');
    const emptyState = document.getElementById('empty-state');
    grid.innerHTML = '';

    if (requests.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    requests.forEach(req => {
        const start = new Date(req.start_date);
        const end = new Date(req.end_date);
        const hours = Math.ceil((end - start) / (1000 * 60 * 60));
        
        // Urgency check (FR-4.4 - 24hr window)
        const createdOn = new Date(req.created_at);
        const hoursSinceCreated = (new Date() - createdOn) / (1000 * 60 * 60);
        const isUrgent = currentMode === 'Pending' && hoursSinceCreated >= 18; 

        const card = document.createElement('div');
        card.className = 'request-card';
        card.innerHTML = `
            <div class="req-header">
                <div class="farmer-info">
                    <div class="farmer-avatar">${req.farmer?.full_name?.charAt(0) || 'F'}</div>
                    <div>
                        <h4 style="margin:0;">${req.farmer?.full_name || 'Anonymous Farmer'}</h4>
                        <p style="font-size:0.75rem; color:#888; margin:0;">Request #${req.id.substring(0,8)}</p>
                    </div>
                </div>
                ${isUrgent ? '<span class="urgency-badge">Urgent: < 6h left</span>' : ''}
                ${currentMode === 'History' ? `<span class="status-badge status-${req.status}">${req.status}</span>` : ''}
            </div>

            <div class="req-details">
                <div class="req-row">
                    <span>Machine:</span>
                    <strong>${req.equipment.name}</strong>
                </div>
                <div class="req-row">
                    <span>Duration:</span>
                    <strong>${hours} Hours</strong>
                </div>
                <div class="req-row">
                    <span>From:</span>
                    <strong>${start.toLocaleString()}</strong>
                </div>
                <div class="req-row">
                    <span>To:</span>
                    <strong>${end.toLocaleString()}</strong>
                </div>
                <div class="req-row" style="margin-top:10px; border-top:1px dashed #eee; padding-top:10px;">
                    <span style="font-weight:600;">Est. Earnings:</span>
                    <strong style="color:var(--primary-green); font-size:1.1rem;">₹${req.total_cost.toLocaleString('en-IN')}</strong>
                </div>
            </div>

            ${currentMode === 'Pending' ? `
                <div class="action-row" style="display:flex; gap:10px;">
                    <button class="btn-approve" onclick="window.updateStatus('${req.id}', 'Approved')">Approve</button>
                    <button class="btn-reject" onclick="window.updateStatus('${req.id}', 'Rejected')">Reject</button>
                </div>
            ` : ''}
        `;
        grid.appendChild(card);
    });
}

function switchTab(mode) {
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
    if (mode === 'Pending') {
        document.getElementById('tab-new').classList.add('active');
    } else {
        document.getElementById('tab-history').classList.add('active');
    }
    loadRequests(mode);
}
window.switchTab = switchTab;

async function updateStatus(id, status) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this booking?`)) return;

    try {
        const { data: booking } = await supabase
            .from('bookings')
            .select('farmer_id, profiles!farmer_id(full_name), equipment:equipment_id(name)')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('bookings')
            .update({ status: status })
            .eq('id', id);

        if (error) throw error;

        if (booking) {
            const farmerName = booking.profiles?.full_name || 'Farmer';
            const { data: { user } } = await supabase.auth.getUser();

            const farmerTitle = status === 'Approved' ? '✅ Booking Confirmed!' : '❌ Request Declined';
            const farmerMsg = status === 'Approved' 
                ? `Great news! The ${booking.equipment.name} is available and your booking is confirmed for the selected dates.`
                : `The owner has declined your request for ${booking.equipment.name}.`;
            
            await sendSystemNotification(booking.farmer_id, farmerTitle, farmerMsg, status === 'Approved' ? 'success' : 'error');

            const ownerTitle = status === 'Approved' ? '🛠️ Schedule Updated' : '🚫 Request Rejected';
            const ownerMsg = status === 'Approved'
                ? `You have approved ${farmerName}'s booking for ${booking.equipment.name}.`
                : `You rejected the request from ${farmerName} for ${booking.equipment.name}.`;

            await sendSystemNotification(user.id, ownerTitle, ownerMsg, 'info');
        }

        alert(`Booking ${status} Successfully!`);
        await loadRequests('Pending');
    } catch (err) {
        alert("Operation Failed: " + err.message);
    }
}
window.updateStatus = updateStatus;
