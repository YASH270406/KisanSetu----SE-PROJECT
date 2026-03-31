// Frontend/equipment_owner/booking_requests.js
import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let pendingRequests = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth
    await initializeDashboard('Equipment Owner');

    // 2. Load Requests
    await loadRequests();
});

async function loadRequests() {
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

        // Step 2: Fetch 'Pending' bookings for these assets
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                equipment:equipment_id (name, hourly_rate),
                farmer:farmer_id (full_name)
            `)
            .in('equipment_id', equipIds)
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        pendingRequests = data;
        renderRequests(pendingRequests);
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
        const isUrgent = hoursSinceCreated >= 18; // Close to 24hr

        const card = document.createElement('div');
        card.className = 'request-card';
        card.innerHTML = `
            <div class="req-header">
                <div class="farmer-info">
                    <div class="farmer-avatar">${req.farmer?.full_name?.charAt(0) || 'F'}</div>
                    <div>
                        <h4 style="margin:0;">${req.farmer?.full_name}</h4>
                        <p style="font-size:0.75rem; color:#888; margin:0;">Request #${req.id.substring(0,8)}</p>
                    </div>
                </div>
                ${isUrgent ? '<span class="urgency-badge">Urgent: < 6h left</span>' : ''}
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

            <div class="action-row">
                <button class="btn-approve" onclick="window.updateStatus('${req.id}', 'Approved')">Approve Request</button>
                <button class="btn-reject" onclick="window.updateStatus('${req.id}', 'Rejected')">Reject</button>
            </div>
        `;
        grid.appendChild(card);
    });
}
// ... (inside updateStatus function)
async function updateStatus(id, status) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this booking?`)) return;

    try {
        // Fetch booking details for notification (FR-7.1)
        const { data: booking } = await supabase
            .from('bookings')
            .select('farmer_id, equipment:equipment_id(name)')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('bookings')
            .update({ status: status })
            .eq('id', id);

        if (error) throw error;

        if (booking) {
            const title = status === 'Approved' ? '✅ Booking Approved!' : '❌ Booking Rejected';
            const msg = status === 'Approved' 
                ? `Owner has approved your booking for ${booking.equipment.name}.`
                : `Owner has declined your request for ${booking.equipment.name}.`;
            
            await sendSystemNotification(booking.farmer_id, title, msg, status === 'Approved' ? 'success' : 'error');
        }

        alert(`Booking ${status} Successfully!`);
        await loadRequests();
    } catch (err) {
        alert("Operation Failed: " + err.message);
    }
}
window.updateStatus = updateStatus;
