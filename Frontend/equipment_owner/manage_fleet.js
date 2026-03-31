// Frontend/equipment_owner/manage_fleet.js
import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';

let myFleet = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Dashboard
    await initializeDashboard('Equipment Owner');
    
    // 2. Load Fleet Data
    await loadFleet();

    // 3. Form Submission
    const form = document.getElementById('equip-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEquipment();
        });
    }
});

async function loadFleet() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('equipment')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        myFleet = data;
        renderFleet();
    } catch (err) {
        console.error("Error loading fleet:", err);
    }
}

function renderFleet() {
    const grid = document.getElementById('fleet-grid');
    const emptyState = document.getElementById('empty-state');
    const fleetView = document.getElementById('fleet-view');

    grid.innerHTML = '';
    
    if (myFleet.length === 0) {
        emptyState.style.display = 'block';
        fleetView.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    fleetView.style.display = 'block';

    myFleet.forEach(item => {
        const card = document.createElement('div');
        card.className = 'equipment-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h3 style="font-size: 1rem; color: #37474f;">${item.name}</h3>
                <span class="status-pill status-${item.status.toLowerCase()}">${item.status}</span>
            </div>
            <div style="font-size: 0.85rem; color: #666; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <p><strong>Model:</strong> ${item.model}</p>
                <p><strong>Power:</strong> ${item.hp} HP</p>
                <p><strong>Rate:</strong> ₹${item.hourly_rate}/hr</p>
                <p><strong>Type:</strong> ${item.type}</p>
            </div>
            <div style="margin-top: 15px; font-size: 0.8rem; color: #888; border-top: 1px solid #f5f5f5; padding-top: 10px;">
                <i class="fa-solid fa-location-dot"></i> ${item.location}
            </div>
        `;
        grid.appendChild(card);
    });
}

async function saveEquipment() {
    const btn = document.querySelector('#equip-form button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering...';
    btn.disabled = true;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Authentication failed.");

        const payload = {
            owner_id: user.id,
            name: document.getElementById('eq-name').value,
            type: document.getElementById('eq-type').value,
            model: document.getElementById('eq-model').value,
            hp: parseInt(document.getElementById('eq-hp').value),
            hourly_rate: parseFloat(document.getElementById('eq-rate').value),
            location: document.getElementById('eq-location').value,
            status: 'Available'
        };

        const { error } = await supabase
            .from('equipment')
            .insert(payload);

        if (error) throw error;

        toggleModal(false);
        document.getElementById('equip-form').reset();
        await loadFleet();
        alert("Equipment registered successfully!");

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// UI Helpers
window.toggleModal = (show) => {
    const modal = document.getElementById('equip-modal');
    if (show) modal.classList.add('open');
    else modal.classList.remove('open');
};
