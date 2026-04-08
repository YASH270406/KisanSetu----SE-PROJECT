import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';
import { initializeNotifications } from '../shared/notifications-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth and Profile
    const { user } = await initializeDashboard('Equipment Owner');
    await initializeNotifications();

    if (user) {
        // 2. Load Recent Activity & Financials
        await loadRecentAlerts(user.id);
        await initDashboardFinancials(user.id);
        
        // 3. Listen for REALTIME alerts
        supabase
            .channel('dashboard-alerts')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications', 
                filter: `user_id=eq.${user.id}` 
            }, () => {
                loadRecentAlerts(user.id);
            })
            .subscribe();
    }

    console.log("Equipment Console: Fleet and Bookings synced.");
});

async function loadRecentAlerts(userId) {
    const container = document.getElementById('alerts-container');
    
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="empty-notif" style="text-align: center; padding: 20px; color: #999; font-size: 0.9rem;">No recent activity.</p>';
        return;
    }

    container.innerHTML = data.map(n => `
        <div class="alert-item ${n.type || 'info'}">
            <i class="fa-solid ${getIcon(n.type)}"></i>
            <div class="alert-text">
                <h4>${n.title}</h4>
                <p>${n.message}</p>
            </div>
        </div>
    `).join('');
}

function getIcon(type) {
    switch(type) {
        case 'warning': return 'fa-bell';
        case 'success': return 'fa-rotate-left';
        case 'error': return 'fa-triangle-exclamation';
        default: return 'fa-info-circle';
    }
}

function toggleSyncStatus() {
    alert("System Status: Synchronized with Supabase Cloud.");
}
window.toggleSyncStatus = toggleSyncStatus;

async function initDashboardFinancials(userId) {
    try {
        const { data: myEquip } = await supabase.from('equipment').select('id').eq('owner_id', userId);
        const equipIds = myEquip?.map(e => e.id) || [];
        if (equipIds.length === 0) return;

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('total_cost, status, start_date, end_date')
            .in('equipment_id', equipIds)
            .in('status', ['Approved', 'Completed']);

        if (error) throw error;

        const total = bookings.reduce((sum, b) => sum + Number(b.total_cost), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthly = bookings
            .filter(b => new Date(b.start_date) >= monthStart)
            .reduce((sum, b) => sum + Number(b.total_cost), 0);

        const activeCount = bookings.filter(b => {
             const start = new Date(b.start_date);
             const end = new Date(b.end_date);
             return now >= start && now <= end;
        }).length;

        document.getElementById('dash-total-earnings').innerText = total.toLocaleString('en-IN');
        document.getElementById('dash-monthly-earnings').innerText = `₹${monthly.toLocaleString('en-IN')}`;
        document.getElementById('dash-active-rentals').innerText = activeCount;
    } catch (err) { console.error("Stats Error:", err); }
}

// Handle the Add Equipment FAB
function addNewEquipment() {
     window.location.href = 'manage_fleet.html';
}
window.addNewEquipment = addNewEquipment;
