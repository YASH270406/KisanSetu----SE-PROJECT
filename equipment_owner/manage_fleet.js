/* ============================================
   manage_fleet.js
   KisanSetu — Equipment Owner: Manage Fleet
   FR-4.1: List equipment with status
   FR-1.5: Add / edit / delete asset form
           (name, HP, model, rate, location)
           + photo upload
   ============================================ */

'use strict';

/* ══ STORAGE KEY ══ */
const FLEET_KEY = 'ks_owner_fleet';

/* ══ DEFAULT DEMO FLEET ══ */
const DEFAULT_FLEET = [
    {
        id: 'FL001',
        name: 'Mahindra 575 DI',
        type: 'Tractor',
        emoji: '🚜',
        model: 'Mahindra 575 DI XP Plus',
        hp: 45,
        usageHours: 1200,
        hourlyRate: 150,
        location: 'Rohtak, Haryana',
        status: 'Available',
        photo: null,
        addedAt: new Date().toISOString()
    },
    {
        id: 'FL002',
        name: 'Fieldking Seed Drill',
        type: 'Seed Drill',
        emoji: '🌱',
        model: 'Fieldking SDAM-9',
        hp: 35,
        usageHours: 550,
        hourlyRate: 100,
        location: 'Rohtak, Haryana',
        status: 'Rented',
        photo: null,
        addedAt: new Date().toISOString()
    },
    {
        id: 'FL003',
        name: 'VST Power Tiller',
        type: 'Tiller',
        emoji: '⚙️',
        model: 'VST Shakti MT 130',
        hp: 13,
        usageHours: 310,
        hourlyRate: 80,
        location: 'Rohtak, Haryana',
        status: 'Maintenance',
        photo: null,
        addedAt: new Date().toISOString()
    }
];

/* ══ STATE ══ */
let fleet           = [];
let activeFilter    = 'all';
let editingId       = null;   // null = adding new, string = editing existing
let deleteTargetId  = null;
let currentPhotoB64 = null;
let currentStatus   = 'Available';

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(FLEET_KEY);
    fleet = saved ? JSON.parse(saved) : [...DEFAULT_FLEET];
    if (!saved) saveFleet();

    renderFleet();
    updateStats();
});

/* ══ SAVE TO LOCALSTORAGE ══ */
function saveFleet() {
    localStorage.setItem(FLEET_KEY, JSON.stringify(fleet));
}

/* ══ RENDER FLEET LIST (FR-4.1) ══ */
function renderFleet() {
    const list      = document.getElementById('fleetList');
    const emptyMsg  = document.getElementById('emptyFleet');

    const filtered = activeFilter === 'all'
        ? fleet
        : fleet.filter(a => a.status === activeFilter);

    if (filtered.length === 0) {
        list.innerHTML = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';

    list.innerHTML = filtered.map((asset, i) => `
      <div class="asset-card" style="animation-delay:${i * 0.06}s">

        ${asset.photo
          ? `<img src="${asset.photo}" alt="${asset.name}" class="asset-photo">`
          : `<div class="asset-photo-placeholder ${typeClass(asset.type)}">
               ${asset.emoji}
               <span class="status-ribbon ${asset.status}">${asset.status}</span>
             </div>`
        }
        ${asset.photo
          ? `<div style="position:relative">
               <span class="status-ribbon ${asset.status}" style="position:absolute;top:10px;right:0">${asset.status}</span>
             </div>`
          : ''
        }

        <div class="asset-body">
          <div class="asset-type-tag">${asset.type}</div>
          <div class="asset-name">${asset.name}</div>

          <div class="asset-specs">
            ${asset.hp > 0 ? `<span class="spec-tag"><i class="fa-solid fa-bolt"></i>${asset.hp} HP</span>` : ''}
            ${asset.model && asset.model !== '—'
              ? `<span class="spec-tag"><i class="fa-solid fa-tag"></i>${asset.model}</span>` : ''}
            ${asset.usageHours > 0
              ? `<span class="spec-tag"><i class="fa-solid fa-clock"></i>${asset.usageHours}h</span>` : ''}
          </div>

          <div class="asset-footer">
            <div>
              <div class="asset-rate">₹${asset.hourlyRate}<small>/hr</small></div>
              <div class="asset-location">
                <i class="fa-solid fa-location-dot" style="font-size:0.65rem;color:var(--primary-green)"></i>
                ${asset.location}
              </div>
            </div>
            <div class="asset-actions">
              <button class="btn-edit" onclick="openEditSheet('${asset.id}')">
                <i class="fa-solid fa-pen"></i> Edit
              </button>
              <button class="btn-delete" onclick="promptDelete('${asset.id}')" title="Delete">
                <i class="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>

      </div>
    `).join('');
}

function typeClass(type) {
    const m = {
        'Tractor':'type-tractor', 'Harvester':'type-harvester',
        'Tiller':'type-tiller', 'Drone':'type-drone',
        'Seed Drill':'type-seed-drill'
    };
    return m[type] || 'type-other';
}

/* ══ STATS ══ */
function updateStats() {
    document.getElementById('statTotal').textContent     = fleet.length;
    document.getElementById('statAvailable').textContent = fleet.filter(a => a.status === 'Available').length;
    document.getElementById('statRented').textContent    = fleet.filter(a => a.status === 'Rented').length;
    document.getElementById('statMaint').textContent     = fleet.filter(a => a.status === 'Maintenance').length;
}

/* ══ FILTER ══ */
function filterFleet(filter, btn) {
    activeFilter = filter;
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderFleet();
}

/* ══ OPEN ADD SHEET (FR-1.5) ══ */
function openAddSheet() {
    editingId        = null;
    currentPhotoB64  = null;
    currentStatus    = 'Available';

    document.getElementById('sheetTitle').textContent   = 'Add New Asset';
    document.getElementById('btnSaveLabel').textContent = 'Add to Fleet';

    // Clear all fields
    clearForm();

    // Hide status selector for new asset (always starts Available)
    document.getElementById('statusFieldGroup').style.display = 'none';

    openSheet();
}

/* ══ OPEN EDIT SHEET ══ */
function openEditSheet(id) {
    const asset = fleet.find(a => a.id === id);
    if (!asset) return;

    editingId       = id;
    currentPhotoB64 = asset.photo || null;
    currentStatus   = asset.status;

    document.getElementById('sheetTitle').textContent   = 'Edit Asset';
    document.getElementById('btnSaveLabel').textContent = 'Save Changes';

    // Populate fields
    document.getElementById('fieldName').value     = asset.name;
    document.getElementById('fieldType').value     = asset.type;
    document.getElementById('fieldHP').value       = asset.hp || '';
    document.getElementById('fieldModel').value    = asset.model !== '—' ? asset.model : '';
    document.getElementById('fieldRate').value     = asset.hourlyRate;
    document.getElementById('fieldUsage').value    = asset.usageHours || '';
    document.getElementById('fieldLocation').value = asset.location;

    // Photo
    if (asset.photo) {
        document.getElementById('photoPreviewImg').src        = asset.photo;
        document.getElementById('photoPreviewImg').style.display = 'block';
        document.getElementById('photoPlaceholder').style.display = 'none';
        document.getElementById('removePhotoBtn').style.display   = 'flex';
    } else {
        resetPhotoUI();
    }

    // Status selector
    document.getElementById('statusFieldGroup').style.display = '';
    setStatus(asset.status, null); // highlight correct btn

    openSheet();
}

function openSheet() {
    document.getElementById('sheetOverlay').classList.add('active');
}

function closeSheet(e) {
    if (e && e.target !== document.getElementById('sheetOverlay')) return;
    closeSheetDirect();
}

function closeSheetDirect() {
    document.getElementById('sheetOverlay').classList.remove('active');
    editingId = null;
}

/* ══ SAVE ASSET (ADD or EDIT) ══ */
function saveAsset() {
    // — Validation —
    let valid = true;

    const name     = document.getElementById('fieldName').value.trim();
    const type     = document.getElementById('fieldType').value;
    const hp       = parseInt(document.getElementById('fieldHP').value) || 0;
    const model    = document.getElementById('fieldModel').value.trim() || '—';
    const rate     = parseFloat(document.getElementById('fieldRate').value);
    const usage    = parseInt(document.getElementById('fieldUsage').value) || 0;
    const location = document.getElementById('fieldLocation').value.trim();

    if (!name) {
        showFieldErr('fieldName', 'errName', 'Name is required');
        valid = false;
    }
    if (!type) {
        showFieldErr('fieldType', 'errType', 'Select a type');
        valid = false;
    }
    if (!rate || rate <= 0) {
        showFieldErr('fieldRate', 'errRate', 'Enter a valid rate');
        valid = false;
    }
    if (!location) {
        showFieldErr('fieldLocation', 'errLocation', 'Location is required');
        valid = false;
    }

    if (!valid) return;

    // — Emoji by type —
    const emojiMap = {
        'Tractor':'🚜','Harvester':'🌾','Tiller':'⚙️',
        'Drone':'🛸','Seed Drill':'🌱','Sprayer':'💧','Other':'🔧'
    };

    if (editingId) {
        // Edit existing
        const idx = fleet.findIndex(a => a.id === editingId);
        if (idx === -1) return;

        fleet[idx] = {
            ...fleet[idx],
            name, type,
            emoji: emojiMap[type] || '🔧',
            model, hp, usageHours: usage,
            hourlyRate: rate, location,
            status: currentStatus,
            photo: currentPhotoB64 !== undefined ? currentPhotoB64 : fleet[idx].photo,
            updatedAt: new Date().toISOString()
        };

        showToast('success', 'Asset Updated', `"${name}" has been saved.`);
    } else {
        // Add new
        const newAsset = {
            id: 'FL' + Date.now(),
            name, type,
            emoji: emojiMap[type] || '🔧',
            model, hp, usageHours: usage,
            hourlyRate: rate, location,
            status: 'Available',
            photo: currentPhotoB64 || null,
            addedAt: new Date().toISOString()
        };

        fleet.unshift(newAsset); // newest first
        showToast('success', 'Asset Added!', `"${name}" is now in your fleet.`);
    }

    saveFleet();
    updateStats();
    renderFleet();
    closeSheetDirect();
}

/* ══ STATUS SELECTOR ══ */
function setStatus(status, btn) {
    currentStatus = status;
    const btns    = document.querySelectorAll('.ss-btn');

    btns.forEach(b => b.classList.remove('active'));

    if (btn) {
        btn.classList.add('active');
    } else {
        // Find and activate the right button
        btns.forEach(b => {
            if (b.classList.contains(status.toLowerCase())) {
                b.classList.add('active');
            }
        });
    }
}

/* ══ DELETE FLOW ══ */
function promptDelete(id) {
    const asset = fleet.find(a => a.id === id);
    if (!asset) return;
    deleteTargetId = id;
    document.getElementById('confirmMsg').textContent =
        `"${asset.name}" will be permanently removed from your fleet.`;
    document.getElementById('confirmOverlay').classList.add('active');
}

function confirmDelete() {
    if (!deleteTargetId) return;
    const asset = fleet.find(a => a.id === deleteTargetId);
    fleet = fleet.filter(a => a.id !== deleteTargetId);
    saveFleet();
    updateStats();
    renderFleet();
    closeConfirm();
    showToast('warning', 'Asset Deleted', `"${asset?.name || 'Asset'}" has been removed.`);
    deleteTargetId = null;
}

function closeConfirm() {
    document.getElementById('confirmOverlay').classList.remove('active');
}

/* ══ PHOTO UPLOAD ══ */
function triggerPhotoUpload() {
    document.getElementById('photoFileInput').click();
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Please choose an image under 5 MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        currentPhotoB64 = e.target.result;
        document.getElementById('photoPreviewImg').src        = currentPhotoB64;
        document.getElementById('photoPreviewImg').style.display = 'block';
        document.getElementById('photoPlaceholder').style.display = 'none';
        document.getElementById('removePhotoBtn').style.display   = 'flex';
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    currentPhotoB64 = null;
    document.getElementById('photoFileInput').value = '';
    resetPhotoUI();
}

function resetPhotoUI() {
    document.getElementById('photoPreviewImg').src           = '';
    document.getElementById('photoPreviewImg').style.display = 'none';
    document.getElementById('photoPlaceholder').style.display = 'flex';
    document.getElementById('removePhotoBtn').style.display   = 'none';
}

/* ══ FORM HELPERS ══ */
function clearForm() {
    ['fieldName','fieldHP','fieldModel','fieldRate','fieldUsage','fieldLocation']
        .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('fieldType').value = '';
    resetPhotoUI();
    document.getElementById('photoFileInput').value = '';
    // Clear errors
    ['errName','errType','errRate','errLocation'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
    ['fieldName','fieldType','fieldRate','fieldLocation'].forEach(id => {
        document.getElementById(id).classList.remove('error');
    });
    // Reset status buttons to Available
    document.querySelectorAll('.ss-btn').forEach(b => b.classList.remove('active'));
    const availBtn = document.querySelector('.ss-btn.available');
    if (availBtn) availBtn.classList.add('active');
    currentStatus = 'Available';
}

function showFieldErr(fieldId, errId, msg) {
    const el = document.getElementById(fieldId);
    el.classList.add('error');
    document.getElementById(errId).textContent = msg;
    el.focus();
}

function clearErr(el) {
    el.classList.remove('error');
    const errId = 'err' + el.id.replace('field', '');
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = '';
}

/* ══ SYNC TOGGLE ══ */
function toggleSync() {
    const ind   = document.getElementById('sync-indicator');
    const online = ind.classList.contains('online');
    ind.classList.toggle('online',  !online);
    ind.classList.toggle('offline',  online);
    showToast(
        online ? 'warning' : 'success',
        online ? 'Offline Mode' : 'Back Online',
        online ? 'Changes saved locally. Syncs when connected.' : 'Syncing fleet data to the cloud…'
    );
}

/* ══ TOAST ══ */
function showToast(type, title, msg) {
    const toast  = document.getElementById('toast');
    const icons  = { success:'✅', warning:'⚠️', error:'❌', info:'ℹ️' };
    const colors = { success:'#2e7d32', warning:'#f57f17', error:'#d32f2f', info:'#1565c0' };

    document.getElementById('toastIcon').textContent  = icons[type]  || '✅';
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMsg').textContent   = msg;
    toast.style.borderLeftColor = colors[type] || '#2e7d32';

    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 4000);
}
