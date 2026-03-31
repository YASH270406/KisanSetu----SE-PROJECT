import { supabase } from '../../supabase-config.js';

'use strict';

// Global State
let EQUIPMENT = [];
let bookings = [];
let selectedEq = null;
let selectedHours = 8;
let activeTypeFilter = 'all';
let currentModalEqId = null;
let calYear, calMonth;

// API Base URL (Relative for deployment)
const API_BASE = '/api/equipment';

/* ══════════════════════════════════════════
   INIT & DATA FETCHING
   (NFR-5.3: Uses Auth Sessions)
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();

    const today = now.toISOString().split('T')[0];
    const bookStart = document.getElementById('bookStart');
    const bookEnd = document.getElementById('bookEnd');
    if (bookStart) bookStart.min = today;
    if (bookEnd) bookEnd.min = today;

    await fetchEquipment();
    await fetchBookings();

    if (typeof populateCalSelect === 'function') populateCalSelect();
    if (typeof renderCalendar === 'function') renderCalendar();
    updateStats();
});

async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
    };
}

async function fetchEquipment() {
    try {
        const response = await fetch(`${API_BASE}/list`);
        const result = await response.json();
        if (result.success) {
            EQUIPMENT = result.data;
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
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/my-bookings`, { headers });
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
    
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');

    if (tabId === 'calendar' && typeof renderCalendar === 'function') renderCalendar();
    if (tabId === 'mybookings') renderBookings('all');
}
window.switchTab = switchTab;

function updateStats() {
    const sAvailable = document.getElementById('s-available');
    const sBookings = document.getElementById('s-bookings');
    const pBadge = document.getElementById('pending-badge');

    if (sAvailable) sAvailable.textContent = EQUIPMENT.filter(e => e.status === 'Available').length;
    if (sBookings) sBookings.textContent  = bookings.length;
    if (pBadge) pBadge.textContent = bookings.filter(b => b.status === 'Pending').length || '';
}

/* ══════════════════════════════════════════
   BROWSE & FILTER EQUIPMENT
══════════════════════════════════════════ */
function applyFilters() {
    const qInput = document.getElementById('searchInput');
    const q = qInput ? qInput.value.toLowerCase().trim() : '';
    let data = EQUIPMENT.filter(eq => {
        const typeOk = activeTypeFilter === 'all' || eq.type === activeTypeFilter;
        const searchOk = !q || eq.name.toLowerCase().includes(q) || eq.location.toLowerCase().includes(q);
        return typeOk && searchOk;
    });
    renderEquipment(data);
}
window.applyFilters = applyFilters;
window.filterEquipment = applyFilters;

function filterByType(type, btn) {
    activeTypeFilter = type;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyFilters();
}
window.filterByType = filterByType;

function renderEquipment(data) {
    const list = document.getElementById('equipmentList');
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = `<div class="empty-state"><h4>No Equipment Found</h4></div>`;
        return;
    }

    list.innerHTML = data.map((eq, i) => `
      <div class="eq-card" style="animation-delay:${i * 0.05}s" onclick="openModal('${eq.id}')">
        <div class="eq-card-accent ${accentClass(eq.type)}"></div>
        <div class="eq-card-body">
          <div class="eq-emoji">${eq.emoji || '🚜'}</div>
          <div class="eq-info">
            <div class="eq-name">${eq.name}</div>
            <div class="eq-meta">
              ${eq.hp > 0 ? `<span><i class="fa-solid fa-bolt"></i> ${eq.hp} HP</span>` : ''}
              <span><i class="fa-solid fa-location-dot"></i> ${eq.location}</span>
            </div>
          </div>
          <div class="eq-right">
            <div class="eq-rate">₹${eq.hourly_rate}<small>/hr</small></div>
            <span class="status-pill ${eq.status}">${eq.status}</span>
            <button class="btn-book-sm" onclick="event.stopPropagation(); window.selectEquipment('${eq.id}')" ${eq.status !== 'Available' ? 'disabled' : ''}>
              ${eq.status === 'Available' ? 'Book' : '—'}
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

    document.getElementById('selEqIcon').textContent  = selectedEq.emoji || '🚜';
    document.getElementById('selEqName').textContent  = selectedEq.name;
    document.getElementById('selEqMeta').textContent  = `${selectedEq.model || ''} · ${selectedEq.location}`;
    document.getElementById('selEqRate').textContent  = `₹${selectedEq.hourly_rate}/hr`;

    calculateCost();
    switchTab('book', document.querySelectorAll('.tab-btn')[1]);
}
window.selectEquipment = selectEquipment;

function setHours(h) {
    selectedHours = h;
    document.querySelectorAll('.hrs-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    calculateCost();
}
window.setHours = setHours;

function calculateCost() {
    const start = document.getElementById('bookStart').value;
    const end   = document.getElementById('bookEnd').value;
    const btn   = document.getElementById('btnSubmitBook');

    if (!start || !end || !selectedEq) {
        if (btn) btn.disabled = true;
        return;
    }
    
    const days  = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    if (days < 1) return;

    const total = days * selectedHours * selectedEq.hourly_rate;
    document.getElementById('calcDuration').textContent = `${days} day(s)`;
    document.getElementById('calcRate').textContent     = `₹${selectedEq.hourly_rate} / hr`;
    document.getElementById('calcHrsDay').textContent   = `${selectedHours} hrs × ${days} day(s)`;
    document.getElementById('calcTotal').textContent    = `₹${total.toLocaleString('en-IN')}`;
    if (btn) btn.disabled = false;
}
window.calculateCost = calculateCost;

async function submitBooking() {
    if (!selectedEq) return;

    const btn = document.getElementById('btnSubmitBook');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    const start   = document.getElementById('bookStart').value;
    const end     = document.getElementById('bookEnd').value;
    const days    = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

    const bookingPayload = {
        equipmentId: selectedEq.id,
        startDate:   start,
        endDate:     end,
        totalCost:   days * selectedHours * selectedEq.hourly_rate
    };

    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE}/book`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bookingPayload)
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast('success', 'Booking Sent!', 'Awaiting owner approval.');
            await fetchBookings(); 
            
            setTimeout(() => {
                switchTab('mybookings', document.querySelectorAll('.tab-btn')[2]);
                btn.innerHTML = originalText;
            }, 1200);
        } else {
            showToast('error', 'Booking Failed', data.message || 'Error occurred');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (err) {
        showToast('error', 'Failed', 'Server error. Try again.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
window.submitBooking = submitBooking;

/* ══════════════════════════════════════════
   RENDER BOOKINGS & MODALS
══════════════════════════════════════════ */
function renderBookings(filter) {
    const list = document.getElementById('bookingsList');
    if (!list) return;

    let data   = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

    if (data.length === 0) {
        list.innerHTML = `<div class="empty-state"><h4>No Bookings Found</h4></div>`;
        return;
    }

    list.innerHTML = data.map(b => `
      <div class="booking-record ${b.status}">
        <div class="bk-header">
          <div>
            <div class="bk-eq-name">${b.equipment?.type === 'Drone' ? '🛸' : '🚜'} ${b.equipment?.name || 'Equipment'}</div>
            <div class="bk-id">ID: ${b.id.substring(0,8).toUpperCase()}</div>
          </div>
          <span class="bk-status-pill ${b.status}">${b.status}</span>
        </div>
        <div class="bk-footer" style="margin-top:10px;">
          <span class="bk-total">₹${Number(b.total_cost).toLocaleString('en-IN')}</span>
          <span class="bk-date">${b.start_date.split('T')[0]} to ${b.end_date.split('T')[0]}</span>
        </div>
      </div>
    `).join('');
}
window.renderBookings = renderBookings;

function filterBookings(filter, btn) {
    document.querySelectorAll('.bk-filter').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderBookings(filter);
}
window.filterBookings = filterBookings;

function openModal(id) {
    const eq = EQUIPMENT.find(e => e.id === id);
    if (!eq) return;
    currentModalEqId = id;

    document.getElementById('modalIcon').textContent = eq.emoji || '🚜';
    document.getElementById('modalName').textContent = eq.name;
    document.getElementById('modalOwner').textContent = `Owner ID: ${eq.owner_id.substring(0,8)}`;
    document.getElementById('modalRate').textContent = `₹${eq.hourly_rate}/hr`;
    document.getElementById('modalLoc').textContent = eq.location;
    
    const mBookBtn = document.getElementById('modalBookBtn');
    if (mBookBtn) mBookBtn.disabled = eq.status !== 'Available';
    document.getElementById('modalBackdrop').classList.add('active');
}
window.openModal = openModal;

function bookFromModal() {
    closeModal({ target: null });
    selectEquipment(currentModalEqId);
}
window.bookFromModal = bookFromModal;

function closeModal(e) {
    const backdrop = document.getElementById('modalBackdrop');
    if (!e.target || e.target === backdrop || e === 'force') {
        backdrop.classList.remove('active');
    }
}
window.closeModal = closeModal;

function showToast(type, title, msg) {
    const toast = document.getElementById('toast');
    if (!toast) {
        alert(`${title}: ${msg}`);
        return;
    }
    const tTitle = document.getElementById('toastTitle');
    const tMsg = document.getElementById('toastMsg');
    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent   = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
window.showToast = showToast;
