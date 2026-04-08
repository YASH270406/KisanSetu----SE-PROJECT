import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';

let calYear, calMonth;
let allBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth
    await initializeDashboard('Equipment Owner');

    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();

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
            renderGrid();
            return;
        }

        // Step 2: Fetch all 'Approved' bookings (including ranges)
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                equipment:equipment_id (name, type, emoji),
                farmer:farmer_id (full_name)
            `)
            .in('equipment_id', equipIds)
            .eq('status', 'Approved');

        if (error) throw error;

        allBookings = data;
        renderGrid();
    } catch (err) {
        console.error("Calendar Error:", err);
    }
}

function renderGrid() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('monthLabel');
    const emptyState = document.getElementById('empty-state');
    
    if (!grid) return;
    grid.innerHTML = '';
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    label.textContent = `${monthNames[calMonth]} ${calYear}`;

    // 1. Headers
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'cal-hdr';
        h.textContent = d;
        grid.appendChild(h);
    });

    // 2. Padding and Days
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-cell other-month';
        grid.appendChild(empty);
    }

    if (allBookings.length === 0 && daysInMonth > 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(calYear, calMonth, d);
        const dateStr = date.toISOString().split('T')[0];
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.textContent = d;

        if (date.toDateString() === today.toDateString()) cell.classList.add('today');

        // Check for bookings on this day (Range Fix)
        const daysBookings = allBookings.filter(b => {
             const start = b.start_date.split('T')[0];
             const end = b.end_date.split('T')[0];
             return dateStr >= start && dateStr <= end;
        });

        if (daysBookings.length > 0) {
            const dotCont = document.createElement('div');
            dotCont.className = 'dot-container';
            // Limit to 3 dots to avoid overflow, but user asked for dots
            daysBookings.slice(0, 4).forEach(() => {
                const dot = document.createElement('div');
                dot.className = 'machine-dot';
                dotCont.appendChild(dot);
            });
            cell.appendChild(dotCont);
            cell.onclick = () => showDayDetails(dateStr, daysBookings);
        } else {
            cell.onclick = () => showDayDetails(dateStr, []);
        }

        grid.appendChild(cell);
    }
}

function showDayDetails(dateStr, bookings) {
    const panel = document.getElementById('day-detail-panel');
    const label = document.getElementById('detail-date-label');
    const list = document.getElementById('day-bookings-list');
    
    panel.style.display = 'block';
    label.textContent = `Schedule for ${new Date(dateStr).toLocaleDateString('en-IN', {day:'numeric', month:'long'})}`;
    list.innerHTML = '';

    if (bookings.length === 0) {
        list.innerHTML = '<p style="font-size:0.8rem; color:#888; text-align:center; padding:10px;">No machines booked this day.</p>';
        return;
    }

    bookings.forEach(b => {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML = `
            <div class="machine-icon">${b.equipment?.emoji || '🚜'}</div>
            <div class="info">
                <h4>${b.equipment.name}</h4>
                <p>Farmer: <strong>${b.farmer?.full_name}</strong></p>
                <p style="font-size:0.7rem;">Duration: ${b.start_date.split('T')[0]} to ${b.end_date.split('T')[0]}</p>
            </div>
            <div style="font-size:0.85rem; font-weight:700; color:#2e7d32;">₹${b.total_cost.toLocaleString('en-IN')}</div>
        `;
        list.appendChild(card);
    });
    
    panel.scrollIntoView({ behavior: 'smooth' });
}

window.prevMonth = () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderGrid();
};

window.nextMonth = () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderGrid();
};
