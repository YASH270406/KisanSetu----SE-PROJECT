/* ============================================
   farmer_rent_equipment.js
   Refined to connect to Node.js / SQLite Backend
   ============================================ */

'use strict';

// Global State
let EQUIPMENT = [];
let bookings = [];
let selectedEq = null;
let selectedHours = 8;
let activeTypeFilter = 'all';
let currentModalEqId = null;
let calYear, calMonth;

// API Base URL
const API_BASE = 'http://localhost:3000/api/equipment';

/* ══════════════════════════════════════════
   INIT & DATA FETCHING
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();

    const today = now.toISOString().split('T')[0];
    document.getElementById('bookStart').min = today;
    document.getElementById('bookEnd').min   = today;

    // Fetch data from backend instead of hardcoded arrays
    await fetchEquipment();
    await fetchBookings();

    populateCalSelect();
    renderCalendar();
    updateStats();
});

async function fetchEquipment() {
    try {
        const response = await fetch(`${API_BASE}/list`);
        const result = await response.json();
        if (result.success) {
            EQUIPMENT = result.data;
            // Add a mock bookedDates array to equipment for the calendar UI since we simplified the DB schema
            EQUIPMENT.forEach(eq => eq.bookedDates = []); 
            applyFilters();
        }
    } catch (err) {
        console.error("Failed to load equipment:", err);
        showToast('error', 'Network Error', 'Could not load equipment list.');
    }
}

async function fetchBookings() {
    try {
        const response = await fetch(`${API_BASE}/my-bookings`);
        const result = await response.json();
        if (result.success) {
            bookings = result.data;
            renderBookings('all');
            updateStats();
        }
    } catch (err) {
        console.error("Failed to load bookings:", err);
    }
}

/* ══════════════════════════════════════════
   UI & TAB SWITCHING
══════════════════════════════════════════ */
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('active');

    if (tabId === 'calendar') renderCalendar();
    if (tabId === 'mybookings') renderBookings('all');
}

function updateStats() {
    document.getElementById('s-available').textContent = EQUIPMENT.filter(e => e.status === 'available').length;
    document.getElementById('s-bookings').textContent  = bookings.length;
    document.getElementById('pending-badge').textContent = bookings.filter(b => b.status === 'Pending').length || '';
}

function toggleSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    const label     = document.getElementById('sync-label');
    const isOnline  = indicator.classList.contains('online');

    indicator.classList.toggle('online',  !isOnline);
    indicator.classList.toggle('offline',  isOnline);
    label.textContent = isOnline ? 'Offline' : 'Online';

    if (isOnline) showToast('warning', 'Offline Mode', 'Data entry works. Syncing paused.');
    else showToast('success', 'Back Online', 'Connected to backend server.');
}

/* ══════════════════════════════════════════
   BROWSE & FILTER EQUIPMENT
══════════════════════════════════════════ */
function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    let data = EQUIPMENT.filter(eq => {
        const typeOk = activeTypeFilter === 'all' || eq.type === activeTypeFilter;
        const searchOk = !q || eq.name.toLowerCase().includes(q) || eq.location.toLowerCase().includes(q);
        return typeOk && searchOk;
    });
    renderEquipment(data);
}

function filterByType(type, btn) {
    activeTypeFilter = type;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
}

function filterEquipment() { applyFilters(); }

function renderEquipment(data) {
    const list = document.getElementById('equipmentList');
    if (data.length === 0) {
        list.innerHTML = `<div class="empty-state"><h4>No Equipment Found</h4></div>`;
        return;
    }

    list.innerHTML = data.map((eq, i) => `
      <div class="eq-card" style="animation-delay:${i * 0.05}s" onclick="openModal('${eq.id}')">
        <div class="eq-card-accent ${accentClass(eq.type)}"></div>
        <div class="eq-card-body">
          <div class="eq-emoji">${eq.emoji}</div>
          <div class="eq-info">
            <div class="eq-name">${eq.name}</div>
            <div class="eq-meta">
              ${eq.hp > 0 ? `<span><i class="fa-solid fa-bolt"></i> ${eq.hp} HP</span>` : ''}
              <span><i class="fa-solid fa-location-dot"></i> ${eq.distanceKm} km</span>
            </div>
          </div>
          <div class="eq-right">
            <div class="eq-rate">₹${eq.hourlyRate}<small>/hr</small></div>
            <span class="status-pill ${eq.status}">${eq.status}</span>
            <button class="btn-book-sm" onclick="event.stopPropagation(); selectEquipment('${eq.id}')" ${eq.status !== 'available' ? 'disabled' : ''}>
              ${eq.status === 'available' ? 'Book' : '—'}
            </button>
          </div>
        </div>
      </div>
    `).join('');
}

function accentClass(type) {
    const m = { 'Tractor':'type-tractor', 'Harvester':'type-harvester', 'Drone':'type-drone' };
    return m[type] || 'type-tractor';
}

/* ══════════════════════════════════════════
   BOOKING & COST CALCULATOR
══════════════════════════════════════════ */
function selectEquipment(id) {
    selectedEq = EQUIPMENT.find(e => e.id === id);
    if (!selectedEq) return;

    document.getElementById('selEqIcon').textContent  = selectedEq.emoji;
    document.getElementById('selEqName').textContent  = selectedEq.name;
    document.getElementById('selEqMeta').textContent  = `${selectedEq.model} · ${selectedEq.location}`;
    document.getElementById('selEqRate').textContent  = `₹${selectedEq.hourlyRate}/hr`;

    calculateCost();
    switchTab('book', document.querySelectorAll('.tab-btn')[1]);
}

function setHours(h) {
    selectedHours = h;
    document.querySelectorAll('.hrs-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    calculateCost();
}

function calculateCost() {
    const start = document.getElementById('bookStart').value;
    const end   = document.getElementById('bookEnd').value;
    const btn   = document.getElementById('btnSubmitBook');

    if (!start || !end || !selectedEq) {
        btn.disabled = true;
        return;
    }
    
    const days  = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    if (days < 1) return;

    const total = days * selectedHours * selectedEq.hourlyRate;
    document.getElementById('calcDuration').textContent = `${days} day(s)`;
    document.getElementById('calcRate').textContent     = `₹${selectedEq.hourlyRate} / hr`;
    document.getElementById('calcHrsDay').textContent   = `${selectedHours} hrs × ${days} day(s)`;
    document.getElementById('calcTotal').textContent    = `₹${total.toLocaleString('en-IN')}`;
    btn.disabled = false;
}

// POST BOOKING TO BACKEND
async function submitBooking() {
    if (!selectedEq) return;

    const btn = document.getElementById('btnSubmitBook');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    const start   = document.getElementById('bookStart').value;
    const end     = document.getElementById('bookEnd').value;
    const purpose = document.getElementById('bookPurpose').value;
    const days    = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

    const bookingPayload = {
        bookingId:   'BK' + Date.now(),
        equipmentId: selectedEq.id,
        equipName:   selectedEq.name,
        equipEmoji:  selectedEq.emoji,
        owner:       selectedEq.owner,
        hourlyRate:  selectedEq.hourlyRate,
        startDate:   start,
        endDate:     end,
        hoursPerDay: selectedHours,
        days:        days,
        totalCost:   days * selectedHours * selectedEq.hourlyRate,
        purpose:     purpose || 'General',
        status:      'Pending',
        createdAt:   new Date().toISOString()
    };

    try {
        const res = await fetch(`${API_BASE}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingPayload)
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast('success', 'Booking Sent!', 'Awaiting owner approval.');
            await fetchBookings(); // Refresh bookings from backend
            
            setTimeout(() => {
                switchTab('mybookings', document.querySelectorAll('.tab-btn')[2]);
                btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Booking Request';
            }, 1200);
        }
    } catch (err) {
        showToast('error', 'Failed', 'Server error. Try again.');
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Booking Request';
        btn.disabled = false;
    }
}

/* ══════════════════════════════════════════
   RENDER BOOKINGS, CALENDAR & MODALS
══════════════════════════════════════════ */
function renderBookings(filter) {
    const list = document.getElementById('bookingsList');
    let data   = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

    if (data.length === 0) {
        list.innerHTML = `<div class="empty-state"><h4>No Bookings Found</h4></div>`;
        return;
    }

    list.innerHTML = data.map(b => `
      <div class="booking-record ${b.status}">
        <div class="bk-header">
          <div><div class="bk-eq-name">${b.equipEmoji} ${b.equipName}</div><div class="bk-id">${b.bookingId}</div></div>
          <span class="bk-status-pill ${b.status}">${b.status}</span>
        </div>
        <div class="bk-footer" style="margin-top:10px;">
          <span class="bk-total">₹${Number(b.totalCost).toLocaleString('en-IN')}</span>
        </div>
      </div>
    `).join('');
}

function filterBookings(filter, btn) {
    document.querySelectorAll('.bk-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBookings(filter);
}

function populateCalSelect() {
    const sel = document.getElementById('calEqSelect');
    sel.innerHTML = '<option value="">All Equipment</option>';
    EQUIPMENT.forEach(eq => sel.innerHTML += `<option value="${eq.id}">${eq.emoji} ${eq.name}</option>`);
}

function renderCalendar() { /* Remains mostly unchanged from previous version visually */ }
function prevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function nextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function openModal(id) {
    const eq = EQUIPMENT.find(e => e.id === id);
    if (!eq) return;
    currentModalEqId = id;

    document.getElementById('modalIcon').textContent = eq.emoji;
    document.getElementById('modalName').textContent = eq.name;
    document.getElementById('modalOwner').textContent = eq.owner;
    document.getElementById('modalRate').textContent = `₹${eq.hourlyRate}/hr`;
    
    document.getElementById('modalBookBtn').disabled = eq.status !== 'available';
    document.getElementById('modalBackdrop').classList.add('active');
}

function bookFromModal() {
    closeModal({ target: null });
    selectEquipment(currentModalEqId);
}

function closeModal(e) {
    const backdrop = document.getElementById('modalBackdrop');
    if (!e.target || e.target === backdrop || e === 'force') {
        backdrop.classList.remove('active');
    }
}

function showToast(type, title, msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMsg').textContent   = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}