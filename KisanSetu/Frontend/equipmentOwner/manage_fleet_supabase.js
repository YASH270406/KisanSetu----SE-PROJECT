/**
 * manage_fleet_supabase.js — KisanSetu Equipment Owner: Live Supabase Connector
 * FR-4.1: List equipment with status, tied securely to the authenticated owner.
 *
 * INTEGRATION: Add AFTER manage_fleet.js in the HTML:
 *   <script type="module" src="manage_fleet_supabase.js"></script>
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { initializeDashboard } from '../shared/auth-helper.js';

const SUPABASE_URL     = 'https://ffigoosgvrtfgtgmrmxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWdvb3NndnJ0Zmd0Z21ybXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzY0NjYsImV4cCI6MjA5MDQxMjQ2Nn0.GjsvWC4eTGczrRsx3hCP5iuKPI_ZIVDY_YhD5U9RIdk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentOwnerId = null;

/* ──────────────────────────────────────────────── 
   MAP Supabase equipment row → manage_fleet.js shape
──────────────────────────────────────────────── */
function mapEquipmentRow(e) {
    const typeEmoji = {
        tractor:    '🚜', seeder: '🌱', drill: '🌱', tiller: '⚙️',
        harvester:  '🌾', pump:   '💧', sprayer: '🌿', other: '🔧'
    };
    const lowerType  = (e.equipment_type || '').toLowerCase();
    const emoji  = Object.entries(typeEmoji).find(([k]) => lowerType.includes(k))?.[1] || '🔧';

    return {
        id:         e.id,
        name:       e.name,
        type:       e.equipment_type || 'Other',
        emoji,
        model:      e.model || '—',
        hp:         e.hp || 0,
        usageHours: 0, // Ignored logic
        hourlyRate: e.hourly_rate || 0,
        location:   e.location || 'Unknown',
        status:     e.status || 'Available',
        photo:      e.image_url || null,
        addedAt:    e.created_at,
        _liveData:  true
    };
}

/* ──────────────────────────────────────────────── 
   LOAD FLEET for the current logged-in owner
──────────────────────────────────────────────── */
async function loadLiveFleet() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        console.warn('[ManageFleet] Not logged in — falling back to local demo data.');
        return false;
    }
    currentOwnerId = user.id;

    const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('owner_id', currentOwnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('[ManageFleet] Supabase query failed:', error.message);
        return false;
    }

    // Overwrite the global UI state
    window.fleet.length = 0;
    data.map(mapEquipmentRow).forEach(asset => window.fleet.push(asset));

    // Update UI Stats
    document.getElementById('statTotal').textContent     = window.fleet.length;
    document.getElementById('statAvailable').textContent = window.fleet.filter(a => a.status === 'Available').length;
    document.getElementById('statRented').textContent    = window.fleet.filter(a => a.status === 'Rented').length;
    document.getElementById('statMaint').textContent     = window.fleet.filter(a => a.status === 'Maintenance').length;

    console.log(`[ManageFleet] ✅ Loaded ${window.fleet.length} equipment items securely from Supabase.`);
    return true;
}

/* ──────────────────────────────────────────────── 
   OVERRIDE SAVE ASSET
──────────────────────────────────────────────── */
window.saveAsset = async function() {
    let valid = true;

    const name     = document.getElementById('fieldName').value.trim();
    const type     = document.getElementById('fieldType').value;
    const hp       = parseInt(document.getElementById('fieldHP').value) || 0;
    const model    = document.getElementById('fieldModel').value.trim() || '—';
    const rate     = parseFloat(document.getElementById('fieldRate').value);
    const location = document.getElementById('fieldLocation').value.trim();

    if (!name) { document.getElementById('fieldName').classList.add('error'); document.getElementById('errName').textContent = 'Name is required'; valid = false; }
    if (!type) { document.getElementById('fieldType').classList.add('error'); document.getElementById('errType').textContent = 'Select a type'; valid = false; }
    if (!rate || rate <= 0) { document.getElementById('fieldRate').classList.add('error'); document.getElementById('errRate').textContent = 'Enter a valid rate'; valid = false; }
    if (!location) { document.getElementById('fieldLocation').classList.add('error'); document.getElementById('errLocation').textContent = 'Location is required'; valid = false; }

    if (!valid || !currentOwnerId) {
        if(!currentOwnerId) alert("You are not logged in. Cannot save to cloud.");
        return;
    }

    const payload = {
        owner_id: currentOwnerId,
        name: name,
        equipment_type: type,
        model: model,
        hp: hp,
        hourly_rate: rate,
        location: location,
        status: window.currentStatus,
    };

    if (window.currentPhotoB64) {
        // Just store the base64 string straight into image_url if provided
        // WARNING: Supabase text limits apply, but it will work for small images.
        payload.image_url = window.currentPhotoB64;
    }

    document.getElementById('btnSaveLabel').textContent = 'Saving...';
    
    try {
        if (window.editingId) {
            // Update
            const { error } = await supabase.from('equipment').update(payload).eq('id', window.editingId);
            if (error) throw error;
            showToast('success', 'Asset Updated', `"${name}" has been saved.`);
        } else {
            // Insert
            const { error } = await supabase.from('equipment').insert(payload);
            if (error) throw error;
            showToast('success', 'Asset Added!', `"${name}" is now in your fleet.`);
        }

        // Reload data
        await loadLiveFleet();
        if(typeof renderFleet === 'function') renderFleet();
        closeSheetDirect();

    } catch (e) {
        console.error("Supabase Save Error:", e);
        showToast('error', 'Database Error', e.message);
    } finally {
        document.getElementById('btnSaveLabel').textContent = window.editingId ? 'Save Changes' : 'Add to Fleet';
    }
};

/* ──────────────────────────────────────────────── 
   OVERRIDE DELETE ASSET
──────────────────────────────────────────────── */
window.confirmDelete = async function() {
    if (!window.deleteTargetId || !currentOwnerId) return;

    try {
        const { error } = await supabase.from('equipment').delete().eq('id', window.deleteTargetId);
        if (error) throw error;

        showToast('warning', 'Asset Deleted', `Asset has been removed from cloud.`);

        // Reload data
        await loadLiveFleet();
        if(typeof renderFleet === 'function') renderFleet();
        document.getElementById('confirmOverlay').classList.remove('active');
        window.deleteTargetId = null;

    } catch (e) {
        console.error("Supabase Delete Error:", e);
        showToast('error', 'Database Error', e.message);
    }
};


/* ──────────────────────────────────────────────── 
   INIT
──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize standard dynamic header (name, location, profile, logout)
    await initializeDashboard('Equipment Owner');

    // Wait for manage_fleet.js local initialization
    await new Promise(r => setTimeout(r, 100));

    const loaded = await loadLiveFleet();
    if (loaded && typeof renderFleet === 'function') {
        renderFleet();
    }
});
