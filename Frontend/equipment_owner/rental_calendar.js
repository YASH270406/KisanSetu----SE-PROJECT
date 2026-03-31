// Frontend/equipment_owner/rental_calendar.js
import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth
    await initializeDashboard('Equipment Owner');

    // 2. Load Calendar Data
    await loadCalendar();
});

async function loadCalendar() {
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
            renderEvents([]);
            return;
        }

        // Step 2: Fetch all 'Approved' bookings
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                equipment:equipment_id (name),
                farmer:farmer_id (full_name)
            `)
            .in('equipment_id', equipIds)
            .eq('status', 'Approved')
            .order('start_date', { ascending: true });

        if (error) throw error;

        renderEvents(data);
    } catch (err) {
        console.error("Calendar Error:", err);
    }
}

function renderEvents(events) {
    const listView = document.getElementById('calendar-view');
    const calendarList = document.getElementById('calendar-list');
    const emptyState = document.getElementById('empty-state');

    calendarList.innerHTML = '';

    if (events.length === 0) {
        listView.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    listView.style.display = 'block';
    emptyState.style.display = 'none';

    events.forEach(event => {
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        
        // Check if event is currently active
        const now = new Date();
        const isActive = now >= start && now <= end;

        const card = document.createElement('div');
        card.className = 'event-card';
        if (isActive) card.style.borderLeftColor = '#2e7d32'; // Green for active

        card.innerHTML = `
            <div class="event-info">
                <h4>${event.equipment.name}</h4>
                <p>Farmer: <strong>${event.farmer?.full_name}</strong></p>
                <p style="font-size: 0.75rem;">Earnings: ₹${event.total_cost.toLocaleString('en-IN')}</p>
                ${isActive ? '<span style="font-size:0.7rem; color:#2e7d32; font-weight:700;">● STAGE: IN-USE</span>' : ''}
            </div>
            <div class="event-date">
                <div style="font-size: 0.7rem; color: #666; margin-bottom: 2px;">SCHEDULED</div>
                <div>${start.toLocaleDateString()}</div>
                <div style="font-size: 0.8rem; opacity: 0.8;">${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
        calendarList.appendChild(card);
    });
}
