import { supabase } from '../supabase-config.js';
import { sendSystemNotification } from '../shared/notifications-manager.js';

let equipmentList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Available Equipment
    await loadEquipment();

    // 2. Attach Calculation Listeners (FR-4.5)
    ['book-start', 'book-end'].forEach(id => {
        document.getElementById(id).addEventListener('input', calculateTotal);
    });

    // 3. Form Submission
    const form = document.getElementById('booking-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitBooking();
        });
    }
});

async function loadEquipment() {
    try {
        const { data, error } = await supabase
            .from('equipment')
            .select(`
                *,
                owner:owner_id (full_name)
            `)
            .eq('status', 'Available')
            .order('created_at', { ascending: false });

        if (error) throw error;

        equipmentList = data;
        renderEquipment();
    } catch (err) {
        console.error("Marketplace Error:", err);
    }
}

function renderEquipment() {
    const grid = document.getElementById('equipment-grid');
    grid.innerHTML = '';

    if (equipmentList.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 50px;">No equipment available in your area yet.</p>';
        return;
    }

    equipmentList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-header">
                <div>
                    <h3 style="font-size: 1.1rem; color: #37474f;">${item.name}</h3>
                    <p style="font-size: 0.8rem; color: #666;">Owner: ${item.owner?.full_name || 'Verified Owner'}</p>
                </div>
                <span class="asset-type">${item.type}</span>
            </div>
            
            <div style="font-size: 0.85rem; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <p><i class="fa-solid fa-cog"></i> Model: <strong>${item.model}</strong></p>
                <p><i class="fa-solid fa-bolt"></i> Power: <strong>${item.hp} HP</strong></p>
                <p><i class="fa-solid fa-location-dot"></i> ${item.location}</p>
                <div class="asset-price">₹${item.hourly_rate}<small>/hr</small></div>
            </div>

            <button class="book-btn" onclick="window.openBookingModal('${item.id}', '${item.name}', ${item.hourly_rate})">
                <i class="fa-solid fa-calendar-plus"></i> Request Booking
            </button>
        `;
        grid.appendChild(card);
    });
}

function calculateTotal() {
    const start = new Date(document.getElementById('book-start').value);
    const end = new Date(document.getElementById('book-end').value);
    const hourlyRate = parseFloat(document.getElementById('booking-rate').value);

    const calcHours = document.getElementById('calc-hours');
    const calcTotal = document.getElementById('calc-total');

    if (!isNaN(start) && !isNaN(end) && end > start) {
        const diffMs = end - start;
        const diffHrs = diffMs / (1000 * 60 * 60);
        const roundedHrs = Math.ceil(diffHrs);
        const totalCost = roundedHrs * hourlyRate;

        calcHours.innerText = `${roundedHrs} Hour(s)`;
        calcTotal.innerText = `₹ ${totalCost.toLocaleString('en-IN')}`;
    } else {
        calcHours.innerText = `0 Hours`;
        calcTotal.innerText = `₹ 0.00`;
    }
}

async function submitBooking() {
    const btn = document.querySelector('#booking-form .primary-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please login to book machinery.");

        const start = new Date(document.getElementById('book-start').value);
        const end = new Date(document.getElementById('book-end').value);
        const equipId = document.getElementById('booking-equip-id').value;
        const hourlyRate = parseFloat(document.getElementById('booking-rate').value);

        if (end <= start) throw new Error("End time must be after start time.");

        const diffHrs = Math.ceil((end - start) / (1000 * 60 * 60));
        const totalCost = diffHrs * hourlyRate;

        const { error } = await supabase
            .from('bookings')
            .insert({
                equipment_id: equipId,
                farmer_id: user.id,
                start_date: start,
                end_date: end,
                total_cost: totalCost,
                status: 'Pending'
            });

        if (error) throw error;

        // 3. Trigger Real-time Notifications (FR-7.1)
        // A. Notify Farmer
        await sendSystemNotification(
            user.id,
            'Booking Request Sent!',
            'Your request has been sent to the owner. You will be notified once they approve.',
            'info'
        );

        // B. Notify Owner
        const { data: equipData } = await supabase
            .from('equipment')
            .select('owner_id, name')
            .eq('id', equipId)
            .single();

        if (equipData) {
            await sendSystemNotification(
                equipData.owner_id,
                'New Booking Request!',
                `A farmer has requested to book your ${equipData.name}. Please review the request.`,
                'warning'
            );
        }

        alert("Booking request sent! The owner will respond within 24 hours.");
        window.toggleModal(false);
        window.location.href = 'farmer_dashboard.html';

    } catch (err) {
        alert("Booking Failed: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// UI Helpers (Global scope)
window.openBookingModal = (id, name, rate) => {
    document.getElementById('booking-equip-id').value = id;
    document.getElementById('booking-rate').value = rate;
    document.getElementById('modal-title').innerText = `Rent ${name}`;
    document.getElementById('modal-subtitle').innerText = `Rate: ₹${rate}/hr`;
    
    toggleModal(true);
};

window.toggleModal = (show) => {
    const modal = document.getElementById('booking-modal');
    if (show) modal.classList.add('open');
    else modal.classList.remove('open');
};
