/* ============================================
   farmer_rent_equipment.js
   KisanSetu — Farmer Equipment Rental View
   FR-4.1: Browse listings
   FR-4.2: Availability calendar per asset
   FR-4.3: Booking request with date/time
   FR-4.4: Status tracking (Pending / Confirmed / etc.)
   FR-4.5: Auto cost = days × hours × hourly_rate
   FR-7.1: Booking notifications
   ============================================ */

'use strict';

/* ══════════════════════════════════════════
   MOCK EQUIPMENT DATA  (FR-4.1)
   Matches same assets as owner dashboard
══════════════════════════════════════════ */
const EQUIPMENT = [
    {
        id: 'EQ001',
        name: 'Mahindra 575 DI',
        type: 'Tractor',
        emoji: '🚜',
        model: 'Mahindra 575 DI XP Plus',
        hp: 45,
        usageHours: 1200,
        hourlyRate: 150,
        location: 'Rohtak, HR',
        distanceKm: 4,
        owner: 'Balram Singh (Owner)',
        status: 'available',
        bookedDates: [3, 4, 10, 11, 18]
    },
    {
        id: 'EQ002',
        name: 'John Deere 5050D',
        type: 'Tractor',
        emoji: '🚜',
        model: 'John Deere 5050D',
        hp: 50,
        usageHours: 860,
        hourlyRate: 200,
        location: 'Jhajjar, HR',
        distanceKm: 14,
        owner: 'Suresh Kumar (Owner)',
        status: 'available',
        bookedDates: [6, 7, 8, 22, 23]
    },
    {
        id: 'EQ003',
        name: 'Claas Crop Tiger',
        type: 'Harvester',
        emoji: '🌾',
        model: 'Claas Crop Tiger 30 GO',
        hp: 62,
        usageHours: 450,
        hourlyRate: 350,
        location: 'Hisar, HR',
        distanceKm: 30,
        owner: 'Kisan Cooperative Society',
        status: 'available',
        bookedDates: [1, 2, 14, 15, 16]
    },
    {
        id: 'EQ004',
        name: 'Sonalika Harvester',
        type: 'Harvester',
        emoji: '🌾',
        model: 'Sonalika SX 66',
        hp: 55,
        usageHours: 720,
        hourlyRate: 280,
        location: 'Bhiwani, HR',
        distanceKm: 22,
        owner: 'Vijay Pratap (Owner)',
        status: 'booked',
        bookedDates: [1, 2, 3, 4, 5, 6, 7, 8]
    },
    {
        id: 'EQ005',
        name: 'VST Power Tiller',
        type: 'Tiller',
        emoji: '⚙️',
        model: 'VST Shakti MT 130',
        hp: 13,
        usageHours: 310,
        hourlyRate: 80,
        location: 'Rohtak, HR',
        distanceKm: 2,
        owner: 'Mohan Lal (Owner)',
        status: 'available',
        bookedDates: [9, 10, 20]
    },
    {
        id: 'EQ006',
        name: 'DJI Agras T40 Drone',
        type: 'Drone',
        emoji: '🛸',
        model: 'DJI Agras T40',
        hp: 0,
        usageHours: 180,
        hourlyRate: 500,
        location: 'Sonipat, HR',
        distanceKm: 46,
        owner: 'AgroTech Solutions (Pvt)',
        status: 'available',
        bookedDates: [12, 13, 25, 26]
    },
    {
        id: 'EQ007',
        name: 'Fieldking Seed Drill',
        type: 'Seed Drill',
        emoji: '🌱',
        model: 'Fieldking SDAM-9',
        hp: 35,
        usageHours: 550,
        hourlyRate: 100,
        location: 'Panipat, HR',
        distanceKm: 38,
        owner: 'Govt. Agriculture Dept.',
        status: 'available',
        bookedDates: [17, 18, 19]
    },
    {
        id: 'EQ008',
        name: 'Farmtrac 45 Powermaxx',
        type: 'Tractor',
        emoji: '🚜',
        model: 'Farmtrac 45 Powermaxx',
        hp: 42,
        usageHours: 990,
        hourlyRate: 130,
        location: 'Karnal, HR',
        distanceKm: 55,
        owner: 'Prem Narayan (Owner)',
        status: 'maintenance',
        bookedDates: []
    }
];

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let selectedEq   = null;
let selectedHours = 8;
let activeTypeFilter = 'all';
let bookings     = JSON.parse(localStorage.getItem('ks_farmer_bookings') || '[]');
let currentModalEqId = null;

// Calendar state
let calYear, calMonth;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();

    // Min dates
    const today = now.toISOString().split('T')[0];
    document.getElementById('bookStart').min = today;
    document.getElementById('bookEnd').min   = today;

    populateCalSelect();
    renderEquipment(EQUIPMENT);
    renderBookings('all');
    renderCalendar();
    updateStats();
});

/* ══════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════ */
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    btn.classList.add('active');

    if (tabId === 'calendar') renderCalendar();
    if (tabId === 'mybookings') renderBookings('all');
}

/* ══════════════════════════════════════════
   STATS UPDATE
══════════════════════════════════════════ */
function updateStats() {
    document.getElementById('s-available').textContent =
        EQUIPMENT.filter(e => e.status === 'available').length;
    document.getElementById('s-bookings').textContent  = bookings.length;
    document.getElementById('pending-badge').textContent =
        bookings.filter(b => b.status === 'Pending').length || '';
}

/* ══════════════════════════════════════════
   EQUIPMENT BROWSE (FR-4.1)
══════════════════════════════════════════ */
function renderEquipment(data) {
    const list = document.getElementById('equipmentList');

    if (data.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h4>No Equipment Found</h4>
            <p>Try a different filter or search term.</p>
          </div>`;
        return;
    }

    list.innerHTML = data.map((eq, i) => `
      <div class="eq-card" style="animation-delay:${i * 0.05}s"
           onclick="openModal('${eq.id}')">
        <div class="eq-card-accent ${accentClass(eq.type)}"></div>
        <div class="eq-card-body">
          <div class="eq-emoji">${eq.emoji}</div>
          <div class="eq-info">
            <div class="eq-name">${eq.name}</div>
            <div class="eq-meta">
              ${eq.hp > 0 ? `<span><i class="fa-solid fa-bolt"></i> ${eq.hp} HP</span>` : ''}
              <span><i class="fa-solid fa-location-dot"></i> ${eq.distanceKm} km</span>
              <span><i class="fa-solid fa-clock"></i> ${eq.usageHours}h used</span>
            </div>
          </div>
          <div class="eq-right">
            <div class="eq-rate">₹${eq.hourlyRate}<small>/hr</small></div>
            <span class="status-pill ${eq.status}">${statusLabel(eq.status)}</span>
            <button class="btn-book-sm"
              onclick="event.stopPropagation(); selectEquipment('${eq.id}')"
              ${eq.status !== 'available' ? 'disabled' : ''}>
              ${eq.status === 'available' ? 'Book' : '—'}
            </button>
          </div>
        </div>
      </div>
    `).join('');
}

function accentClass(type) {
    const m = {
        'Tractor':'type-tractor','Harvester':'type-harvester',
        'Tiller':'type-tiller','Drone':'type-drone','Seed Drill':'type-seed-drill'
    };
    return m[type] || 'type-tractor';
}

function statusLabel(s) {
    return { available:'Available', booked:'Booked', maintenance:'Maintenance' }[s] || s;
}

/* Filter by type chip */
function filterByType(type, btn) {
    activeTypeFilter = type;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
}

/* Search input filter */
function filterEquipment() { applyFilters(); }

function applyFilters() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    let data = EQUIPMENT.filter(eq => {
        const typeOk = activeTypeFilter === 'all' || eq.type === activeTypeFilter;
        const searchOk = !q || eq.name.toLowerCase().includes(q) ||
                         eq.type.toLowerCase().includes(q) ||
                         eq.location.toLowerCase().includes(q);
        return typeOk && searchOk;
    });
    renderEquipment(data);
}

/* ══════════════════════════════════════════
   EQUIPMENT SELECTION FOR BOOKING (FR-4.3)
══════════════════════════════════════════ */
function selectEquipment(id) {
    selectedEq = EQUIPMENT.find(e => e.id === id);
    if (!selectedEq) return;

    // Update Book tab header card
    document.getElementById('selEqIcon').textContent  = selectedEq.emoji;
    document.getElementById('selEqName').textContent  = selectedEq.name;
    document.getElementById('selEqMeta').textContent  =
        `${selectedEq.model} · ${selectedEq.location}`;
    document.getElementById('selEqRate').textContent  = `₹${selectedEq.hourlyRate}/hr`;

    calculateCost();

    // Switch to book tab
    switchTab('book', document.querySelectorAll('.tab-btn')[1]);

    showToast('info', 'Equipment Selected',
        `${selectedEq.name} ready to book. Fill in dates below.`);
}

/* ══════════════════════════════════════════
   COST CALCULATOR (FR-4.5)
══════════════════════════════════════════ */
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
        resetCostDisplay();
        btn.disabled = true;
        return;
    }

    const sDate = new Date(start);
    const eDate = new Date(end);

    if (eDate < sDate) {
        resetCostDisplay();
        btn.disabled = true;
        return;
    }

    const days  = Math.ceil((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
    const rate  = selectedEq.hourlyRate;
    const total = days * selectedHours * rate;

    document.getElementById('calcDuration').textContent =
        `${days} day${days > 1 ? 's' : ''}`;
    document.getElementById('calcRate').textContent     = `₹${rate} / hr`;
    document.getElementById('calcHrsDay').textContent   =
        `${selectedHours} hrs × ${days} day${days > 1 ? 's' : ''}`;
    document.getElementById('calcTotal').textContent    =
        `₹${total.toLocaleString('en-IN')}`;

    btn.disabled = false;
}

function resetCostDisplay() {
    ['calcDuration','calcRate','calcHrsDay','calcTotal'].forEach(id => {
        document.getElementById(id).textContent = '—';
    });
}

/* ══════════════════════════════════════════
   SUBMIT BOOKING (FR-4.3, FR-4.4)
══════════════════════════════════════════ */
function submitBooking() {
    if (!selectedEq) { alert('Please select equipment first.'); return; }

    const start   = document.getElementById('bookStart').value;
    const end     = document.getElementById('bookEnd').value;
    const purpose = document.getElementById('bookPurpose').value;

    if (!start || !end) { alert('Please fill in both dates.'); return; }

    const days  = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    const total = days * selectedHours * selectedEq.hourlyRate;

    const booking = {
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
        totalCost:   total,
        purpose:     purpose || '—',
        status:      'Pending',       // FR-4.4: starts as Pending
        createdAt:   new Date().toISOString()
    };

    bookings.push(booking);
    localStorage.setItem('ks_farmer_bookings', JSON.stringify(bookings));
    updateStats();

    showToast('success', 'Booking Requested!',
        `${booking.bookingId} — ₹${total.toLocaleString('en-IN')} · Awaiting owner approval`);

    // Reset form
    document.getElementById('bookStart').value   = '';
    document.getElementById('bookEnd').value     = '';
    document.getElementById('bookPurpose').value = '';
    document.getElementById('btnSubmitBook').disabled = true;
    resetCostDisplay();

    // Switch to My Bookings tab
    setTimeout(() => {
        switchTab('mybookings', document.querySelectorAll('.tab-btn')[2]);
        renderBookings('all');
    }, 1200);
}

/* ══════════════════════════════════════════
   MY BOOKINGS (FR-4.4, FR-7.1)
══════════════════════════════════════════ */
function renderBookings(filter) {
    const list = document.getElementById('bookingsList');
    let data   = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

    // Add demo bookings if none exist yet
    if (bookings.length === 0) {
        bookings = getDemoBookings();
        localStorage.setItem('ks_farmer_bookings', JSON.stringify(bookings));
        data = bookings;
        updateStats();
    }

    if (data.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h4>No Bookings Yet</h4>
            <p>Go to Browse tab to find and book equipment.</p>
          </div>`;
        return;
    }

    list.innerHTML = data.slice().reverse().map(b => `
      <div class="booking-record ${b.status}">
        <div class="bk-header">
          <div>
            <div class="bk-eq-name">${b.equipEmoji || '🚜'} ${b.equipName}</div>
            <div class="bk-id">${b.bookingId}</div>
          </div>
          <span class="bk-status-pill ${b.status}">${b.status}</span>
        </div>
        <div class="bk-details">
          <span><i class="fa-regular fa-calendar"></i> ${formatDate(b.startDate)} → ${formatDate(b.endDate)}</span>
          <span><i class="fa-solid fa-clock"></i> ${b.hoursPerDay}hrs/day</span>
          <span><i class="fa-solid fa-user"></i> ${b.owner || 'Owner'}</span>
        </div>
        <div class="bk-footer">
          <span class="bk-total">₹${Number(b.totalCost).toLocaleString('en-IN')}</span>
          <div style="display:flex;gap:8px">
            ${b.status === 'Pending'
              ? `<button class="btn-cancel-sm" onclick="cancelBooking('${b.bookingId}')">Cancel</button>`
              : ''}
            ${b.status === 'Confirmed' || b.status === 'Completed'
              ? `<button class="btn-receipt-sm" onclick="downloadReceipt('${b.bookingId}')"><i class="fa-solid fa-download"></i> Receipt</button>`
              : ''}
          </div>
        </div>
      </div>
    `).join('');
}

function filterBookings(filter, btn) {
    document.querySelectorAll('.bk-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBookings(filter);
}

function cancelBooking(bookingId) {
    if (!confirm('Cancel this booking request?')) return;
    const idx = bookings.findIndex(b => b.bookingId === bookingId);
    if (idx === -1) return;
    bookings[idx].status = 'Cancelled';
    localStorage.setItem('ks_farmer_bookings', JSON.stringify(bookings));
    renderBookings('all');
    updateStats();
    showToast('warning', 'Booking Cancelled', `Booking ${bookingId} has been cancelled.`);
}

function downloadReceipt(bookingId) {
    const b = bookings.find(bk => bk.bookingId === bookingId);
    if (!b) return;
    const content = `
KisanSetu — Rental Agreement / Receipt
=======================================
Booking ID  : ${b.bookingId}
Equipment   : ${b.equipName}
Owner       : ${b.owner}
Dates       : ${b.startDate} to ${b.endDate} (${b.days} day/s)
Hours/Day   : ${b.hoursPerDay} hrs
Rate        : ₹${b.hourlyRate}/hr
Total Cost  : ₹${Number(b.totalCost).toLocaleString('en-IN')}
Purpose     : ${b.purpose}
Status      : ${b.status}
Generated   : ${new Date().toLocaleString()}
=======================================
KisanSetu | Kisan Ka Digital Sathi
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Receipt_${bookingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Receipt Downloaded', `${bookingId}.txt saved.`);
}

function getDemoBookings() {
    return [
        {
            bookingId: 'BK1720000001',
            equipmentId: 'EQ001',
            equipName: 'Mahindra 575 DI',
            equipEmoji: '🚜',
            owner: 'Balram Singh (Owner)',
            hourlyRate: 150,
            startDate: '2025-10-15',
            endDate: '2025-10-16',
            hoursPerDay: 8,
            days: 2,
            totalCost: 2400,
            purpose: 'Ploughing / Tilling',
            status: 'Confirmed',
            createdAt: new Date().toISOString()
        },
        {
            bookingId: 'BK1720000002',
            equipmentId: 'EQ007',
            equipName: 'Fieldking Seed Drill',
            equipEmoji: '🌱',
            owner: 'Govt. Agriculture Dept.',
            hourlyRate: 100,
            startDate: '2025-10-20',
            endDate: '2025-10-20',
            hoursPerDay: 4,
            days: 1,
            totalCost: 400,
            purpose: 'Sowing / Seed Drilling',
            status: 'Pending',
            createdAt: new Date().toISOString()
        }
    ];
}

function formatDate(d) {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(m,10)-1]}`;
}

/* ══════════════════════════════════════════
   AVAILABILITY CALENDAR (FR-4.2)
══════════════════════════════════════════ */
function populateCalSelect() {
    const sel = document.getElementById('calEqSelect');
    EQUIPMENT.forEach(eq => {
        const opt = document.createElement('option');
        opt.value = eq.id;
        opt.textContent = `${eq.emoji} ${eq.name}`;
        sel.appendChild(opt);
    });
}

function renderCalendar() {
    const label   = document.getElementById('calMonthLabel');
    const grid    = document.getElementById('calendarGrid');
    const selEqId = document.getElementById('calEqSelect').value;

    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    label.textContent = `${months[calMonth]} ${calYear}`;

    const today    = new Date();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMo = new Date(calYear, calMonth + 1, 0).getDate();

    // Build booked set from selected equipment
    const bookedSet = new Set();
    if (selEqId) {
        const eq = EQUIPMENT.find(e => e.id === selEqId);
        if (eq) eq.bookedDates.forEach(d => bookedSet.add(d));
    } else {
        EQUIPMENT.forEach(eq => eq.bookedDates.forEach(d => bookedSet.add(d)));
    }

    // My bookings days
    const myDays = new Set();
    bookings.forEach(b => {
        if (selEqId && b.equipmentId !== selEqId) return;
        if (b.status === 'Cancelled') return;
        const s = new Date(b.startDate);
        const e = new Date(b.endDate);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
                myDays.add(d.getDate());
            }
        }
    });

    const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let html = days.map(d => `<div class="cal-day-hdr">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMo; d++) {
        const isToday = d === today.getDate() &&
                        calMonth === today.getMonth() &&
                        calYear  === today.getFullYear();
        const isPast  = new Date(calYear, calMonth, d) <
                        new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isMyBook = myDays.has(d);
        const isBooked = bookedSet.has(d) && !isMyBook;

        let cls = 'cal-day';
        if (isToday)         cls += ' today-day';
        else if (isMyBook)   cls += ' my-book';
        else if (isBooked)   cls += ' booked';
        else if (isPast)     cls += ' past';
        else                 cls += ' free';

        html += `<div class="${cls}">${d}</div>`;
    }

    grid.innerHTML = html;
}

function prevMonth() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
}

function nextMonth() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
}

/* ══════════════════════════════════════════
   EQUIPMENT DETAIL MODAL
══════════════════════════════════════════ */
function openModal(id) {
    const eq = EQUIPMENT.find(e => e.id === id);
    if (!eq) return;
    currentModalEqId = id;

    document.getElementById('modalIcon').textContent   = eq.emoji;
    document.getElementById('modalName').textContent   = eq.name;
    document.getElementById('modalOwner').textContent  = `${eq.owner} · ${eq.location}`;
    document.getElementById('modalRate').textContent   = `₹${eq.hourlyRate}/hr`;
    document.getElementById('modalLoc').textContent    = `📍 ${eq.location} (${eq.distanceKm} km)`;

    const statusBadge = document.getElementById('modalStatus');
    statusBadge.textContent = statusLabel(eq.status);
    statusBadge.className   = `modal-status-badge ${eq.status}`;

    document.getElementById('modalSpecs').innerHTML = `
        ${eq.hp > 0 ? `
        <div class="modal-spec-item">
          <div class="modal-spec-lbl">Horsepower</div>
          <div class="modal-spec-val">${eq.hp} HP</div>
        </div>` : ''}
        <div class="modal-spec-item">
          <div class="modal-spec-lbl">Model</div>
          <div class="modal-spec-val" style="font-size:0.78rem">${eq.model}</div>
        </div>
        <div class="modal-spec-item">
          <div class="modal-spec-lbl">Total Usage</div>
          <div class="modal-spec-val">${eq.usageHours} hrs</div>
        </div>
        <div class="modal-spec-item">
          <div class="modal-spec-lbl">Distance</div>
          <div class="modal-spec-val">${eq.distanceKm} km</div>
        </div>
    `;

    const bookBtn = document.getElementById('modalBookBtn');
    bookBtn.disabled = eq.status !== 'available';
    bookBtn.textContent = eq.status === 'available'
        ? '  Book This Equipment' : '  Currently Unavailable';

    document.getElementById('modalBackdrop').classList.add('active');
}

function bookFromModal() {
    if (!currentModalEqId) return;
    closeModal({ target: null });
    selectEquipment(currentModalEqId);
}

function closeModal(e) {
    const backdrop = document.getElementById('modalBackdrop');
    if (!e.target || e.target === backdrop) {
        backdrop.classList.remove('active');
        currentModalEqId = null;
    }
}

/* ══════════════════════════════════════════
   CONNECTIVITY TOGGLE (mirrors owner dashboard)
══════════════════════════════════════════ */
function toggleSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    const label     = document.getElementById('sync-label');
    const isOnline  = indicator.classList.contains('online');

    indicator.classList.toggle('online',  !isOnline);
    indicator.classList.toggle('offline',  isOnline);
    label.textContent = isOnline ? 'Offline' : 'Online';

    if (isOnline) {
        showToast('warning', 'Offline Mode',
            'Data entry still works. Bookings will sync when connected.');
    } else {
        showToast('success', 'Back Online',
            'Syncing bookings and availability to the cloud…');
    }
}

/* ══════════════════════════════════════════
   TOAST NOTIFICATION (FR-7.1)
══════════════════════════════════════════ */
function showToast(type, title, msg) {
    const toast = document.getElementById('toast');
    const icons = { success:'✅', warning:'⚠️', info:'ℹ️', error:'❌' };

    document.getElementById('toastIcon').textContent  = icons[type] || '✅';
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMsg').textContent   = msg;

    toast.style.borderLeftColor = {
        success: '#2e7d32', warning: '#f57f17', info: '#1565c0', error: '#c62828'
    }[type] || '#2e7d32';

    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 4000);
}
