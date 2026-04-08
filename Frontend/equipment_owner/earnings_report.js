import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth
    const { user } = await initializeDashboard('Equipment Owner');

    // 2. Load Earnings Data
    await loadEarningsReport(user.id);
});

async function loadEarningsReport(userId) {
    const list = document.getElementById('equipment-performance-list');
    const emptyState = document.getElementById('empty-state');
    
    try {
        // Step 1: Get owner's equipment
        const { data: myEquip } = await supabase
            .from('equipment')
            .select('*')
            .eq('owner_id', userId);
        
        const equipIds = myEquip?.map(e => e.id) || [];
        if (equipIds.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        // Step 2: Fetch all revenue-generating bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*')
            .in('equipment_id', equipIds)
            .in('status', ['Approved', 'Completed']);

        if (error) throw error;

        if (!bookings || bookings.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            document.getElementById('lifetime-earnings').innerText = '₹0';
            document.getElementById('monthly-earnings').innerText  = '₹0';
            return;
        }

        emptyState.style.display = 'none';

        // Step 3: Global Aggregates
        const total = bookings.reduce((sum, b) => sum + Number(b.total_cost), 0);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthly = bookings
            .filter(b => new Date(b.start_date) >= monthStart)
            .reduce((sum, b) => sum + Number(b.total_cost), 0);

        document.getElementById('lifetime-earnings').innerText = `₹${total.toLocaleString('en-IN')}`;
        document.getElementById('monthly-earnings').innerText  = `₹${monthly.toLocaleString('en-IN')}`;

        // Step 4: Per Machine Aggregates
        const performance = myEquip.map(eq => {
            const eqBookings = bookings.filter(b => b.equipment_id === eq.id);
            const eqRevenue  = eqBookings.reduce((sum, b) => sum + Number(b.total_cost), 0);
            return {
                ...eq,
                revenue: eqRevenue,
                count:   eqBookings.length
            };
        });

        // Sort by revenue descending
        performance.sort((a,b) => b.revenue - a.revenue);

        // Step 5: Render List
        list.innerHTML = performance.map(p => `
            <div class="perf-card">
                <div class="perf-info">
                    <div class="perf-icon">${p.emoji || '🚜'}</div>
                    <div class="perf-name">
                        <h4>${p.name}</h4>
                        <p>${p.type} · ${p.location}</p>
                    </div>
                </div>
                <div class="perf-value">
                    <div class="amt">₹${p.revenue.toLocaleString('en-IN')}</div>
                    <div class="count">${p.count} successful rentals</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Earnings Error:", err);
        list.innerHTML = `<p style="color:red; text-align:center;">Failed to load report: ${err.message}</p>`;
    }
}
