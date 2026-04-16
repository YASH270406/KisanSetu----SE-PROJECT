/* ============================================
   booking_requests.js
   KisanSetu — Equipment Owner: Booking Requests
   FR-4.4: Owner Approve / Reject booking within 24hrs
   FR-7.1: Cross-role notification on status change
            (Farmer notified on Approve → Confirmed
             and Reject → Cancelled)
   ============================================ */

'use strict';

/* ══ STORAGE KEYS ══ */
const REQUESTS_KEY    = 'ks_booking_requests';   // owner-side
const FARMER_BK_KEY   = 'ks_farmer_bookings';    // farmer-side (for cross-role sync)
const NOTIF_KEY       = 'ks_notifications';

/* ══ DEMO REQUESTS (pre-seeded) ══ */
function buildDemoRequests() {
    const now = Date.now();
    return [
        {
            id: 'REQ001',
            bookingId:     'BK1720000010',
            farmerName:    'Ramesh Kumar',
            farmerPhone:   '9876543210',
            farmerVillage: 'Sampla, Rohtak',
            farmerInitials:'RK',
            equipId:       'FL001',
            equipName:     'Mahindra 575 DI',
            equipEmoji:    '🚜',
            equipModel:    'Mahindra 575 DI XP Plus · Rohtak, HR',
            hourlyRate:    150,
            startDate:     '2025-10-15',
            endDate:       '2025-10-16',
            days:          2,
            hoursPerDay:   8,
            totalCost:     2400,
            purpose:       'Ploughing / Tilling',
            status:        'Pending',
            receivedAt:    new Date(now - 3 * 60 * 60 * 1000).toISOString(),  // 3 hrs ago
            deadline:      new Date(now + 21 * 60 * 60 * 1000).toISOString()  // 21 hrs left
        },
        {
            id: 'REQ002',
            bookingId:     'BK1720000011',
            farmerName:    'Sunil Yadav',
            farmerPhone:   '9812345678',
            farmerVillage: 'Bahadurgarh, Jhajjar',
            farmerInitials:'SY',
            equipId:       'FL001',
            equipName:     'Mahindra 575 DI',
            equipEmoji:    '🚜',
            equipModel:    'Mahindra 575 DI XP Plus · Rohtak, HR',
            hourlyRate:    150,
            startDate:     '2025-10-18',
            endDate:       '2025-10-18',
            days:          1,
            hoursPerDay:   4,
            totalCost:     600,
            purpose:       'Sowing / Seed Drilling',
            status:        'Pending',
            receivedAt:    new Date(now - 18 * 60 * 60 * 1000).toISOString(), // 18 hrs ago
            deadline:      new Date(now + 6 * 60 * 60 * 1000).toISOString()   // 6 hrs left — urgent!
        },
        {
            id: 'REQ003',
            bookingId:     'BK1720000009',
            farmerName:    'Deepak Singh',
            farmerPhone:   '9988776655',
            farmerVillage: 'Meham, Rohtak',
            farmerInitials:'DS',
            equipId:       'FL002',
            equipName:     'Fieldking Seed Drill',
            equipEmoji:    '🌱',
            equipModel:    'Fieldking SDAM-9 · Rohtak, HR',
            hourlyRate:    100,
            startDate:     '2025-10-10',
            endDate:       '2025-10-10',
            days:          1,
            hoursPerDay:   8,
            totalCost:     800,
            purpose:       'Sowing / Seed Drilling',
            status:        'Confirmed',
            receivedAt:    new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            deadline:      new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
            actionedAt:    new Date(now - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'REQ004',
            bookingId:     'BK1720000008',
            farmerName:    'Ajay Hooda',
            farmerPhone:   '9811223344',
            farmerVillage: 'Kalanaur, Rohtak',
            farmerInitials:'AH',
            equipId:       'FL003',
            equipName:     'VST Power Tiller',
            equipEmoji:    '⚙️',
            equipModel:    'VST Shakti MT 130 · Rohtak, HR',
            hourlyRate:    80,
            startDate:     '2025-10-08',
            endDate:       '2025-10-09',
            days:          2,
            hoursPerDay:   4,
            totalCost:     640,
            purpose:       'Ploughing / Tilling',
            status:        'Cancelled',
            receivedAt:    new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
            deadline:      new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
            actionedAt:    new Date(now - 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString()
        }
    ];
}

/* ══ STATE ══ */
let requests      = [];
let activeFilter  = 'all';
let activeReqId   = null;   // open in sheet
let pendingAction = null;   // { reqId, type: 'approve'|'reject' }

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(REQUESTS_KEY);
    requests = saved ? JSON.parse(saved) : buildDemoRequests();
    if (!saved) saveRequests();

    renderAll();

    // Refresh countdown every minute
    setInterval(refreshCountdowns, 60 * 1000);
});

function saveRequests() {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

/* ══ RENDER ALL ══ */
function renderAll() {
    updateStats();
    updateCounts();
    updateHeaderSub();
    renderList();
}

/* ══ HEADER SUB ══ */
function updateHeaderSub() {
    const pending = requests.filter(r => r.status === 'Pending').length;
    document.getElementById('headerSub').textContent =
        pending > 0 ? `${pending} awaiting your response` : 'All requests reviewed';
}

/* ══ STATS ══ */
function updateStats() {
    const pending   = requests.filter(r => r.status === 'Pending').length;
    const confirmed = requests.filter(r => r.status === 'Confirmed').length;
    const cancelled = requests.filter(r => r.status === 'Cancelled').length;
    const earnings  = requests
        .filter(r => r.status === 'Confirmed')
        .reduce((sum, r) => sum + r.totalCost, 0);

    document.getElementById('statPending').textContent   = pending;
    document.getElementById('statConfirmed').textContent = confirmed;
    document.getElementById('statCancelled').textContent = cancelled;
    document.getElementById('statEarnings').textContent  = `₹${earnings.toLocaleString('en-IN')}`;
}

/* ══ PILL COUNTS ══ */
function updateCounts() {
    const all     = requests.length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    document.getElementById('countAll').textContent     = all;
    document.getElementById('countPending').textContent = pending;
}

/* ══ FILTER ══ */
function filterRequests(filter, btn) {
    activeFilter = filter;
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
}

/* ══ RENDER LIST ══ */
function renderList() {
    const list      = document.getElementById('requestsList');
    const emptyMsg  = document.getElementById('emptyState');

    const filtered = activeFilter === 'all'
        ? requests
        : requests.filter(r => r.status === activeFilter);

    // Sort: Pending first, then by deadline
    const sorted = [...filtered].sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return  1;
        return new Date(a.deadline) - new Date(b.deadline);
    });

    if (sorted.length === 0) {
        list.innerHTML  = '';
        emptyMsg.style.display = 'block';
        return;
    }

    emptyMsg.style.display = 'none';

    list.innerHTML = sorted.map((req, i) => {
        const countdown  = getCountdown(req);
        const isPending  = req.status === 'Pending';

        return `
        <div class="request-card ${req.status}" style="animation-delay:${i * 0.06}s"
             onclick="openSheet('${req.id}')">

          <div class="card-top">
            <div class="farmer-avatar">${req.farmerInitials}</div>
            <div class="card-main">
              <div class="farmer-name">${req.farmerName}</div>
              <div class="farmer-village">
                <i class="fa-solid fa-location-dot" style="font-size:0.62rem;color:var(--primary-green)"></i>
                ${req.farmerVillage}
              </div>
              <span class="eq-tag">${req.equipEmoji} ${req.equipName}</span>
            </div>
            <div class="card-right">
              <span class="status-badge ${req.status}">${req.status}</span>
              <span class="card-amount">₹${req.totalCost.toLocaleString('en-IN')}</span>
              ${isPending
                ? `<span class="countdown-chip ${countdown.cls}">
                     <i class="fa-regular fa-clock"></i> ${countdown.short}
                   </span>`
                : ''}
            </div>
          </div>

          <div class="card-footer">
            <div class="date-range">
              <i class="fa-regular fa-calendar"></i>
              ${formatDate(req.startDate)} → ${formatDate(req.endDate)}
              &nbsp;·&nbsp; ${req.days} day${req.days > 1 ? 's' : ''}
            </div>
            ${isPending
              ? `<div class="card-actions" onclick="event.stopPropagation()">
                   <button class="btn-card-reject"
                     onclick="triggerAction('${req.id}','reject')">
                     <i class="fa-solid fa-xmark"></i> Reject
                   </button>
                   <button class="btn-card-approve"
                     onclick="triggerAction('${req.id}','approve')">
                     <i class="fa-solid fa-check"></i> Approve
                   </button>
                 </div>`
              : `<span style="font-size:0.7rem;color:var(--charcoal-lt)">
                   ${req.status === 'Confirmed'
                     ? '<i class="fa-solid fa-circle-check" style="color:var(--primary-green)"></i> Approved'
                     : '<i class="fa-solid fa-circle-xmark" style="color:var(--danger)"></i> Rejected'}
                 </span>`
            }
          </div>
        </div>`;
    }).join('');
}

/* ══ COUNTDOWN LOGIC (FR-4.4) ══ */
function getCountdown(req) {
    if (req.status !== 'Pending') {
        return { short: 'Done', long: 'Already actioned', cls: 'done' };
    }

    const msLeft = new Date(req.deadline) - Date.now();

    if (msLeft <= 0) {
        return { short: 'Expired', long: 'Approval window has expired', cls: 'urgent' };
    }

    const hoursLeft   = Math.floor(msLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

    const cls  = hoursLeft < 6 ? 'urgent' : 'normal';
    const short = hoursLeft > 0
        ? `${hoursLeft}h ${minutesLeft}m left`
        : `${minutesLeft}m left`;
    const long  = hoursLeft > 0
        ? `${hoursLeft} hrs ${minutesLeft} min remaining to respond`
        : `Only ${minutesLeft} minutes remaining — respond now!`;

    return { short, long, cls };
}

function refreshCountdowns() {
    // Re-render silently to update all countdowns
    renderList();
}

/* ══ OPEN DETAIL SHEET ══ */
function openSheet(reqId) {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    activeReqId = reqId;

    const isPending  = req.status === 'Pending';
    const countdown  = getCountdown(req);

    // Equipment banner
    document.getElementById('sheetEqEmoji').textContent = req.equipEmoji;
    document.getElementById('sheetEqName').textContent  = req.equipName;
    document.getElementById('sheetEqMeta').textContent  = req.equipModel;
    const sheetBadge = document.getElementById('sheetStatus');
    sheetBadge.textContent = req.status;
    sheetBadge.className   = `sheet-status-badge ${req.status}`;

    // Sheet title
    document.getElementById('sheetTitle').textContent = `#${req.bookingId}`;

    // Farmer info
    document.getElementById('sheetFarmerName').textContent   = req.farmerName;
    document.getElementById('sheetFarmerPhone').textContent  = req.farmerPhone;
    document.getElementById('sheetFarmerVillage').textContent = req.farmerVillage;
    document.getElementById('sheetPurpose').textContent      = req.purpose || '—';

    // Booking details
    document.getElementById('sheetFrom').textContent      = formatDateFull(req.startDate);
    document.getElementById('sheetTo').textContent        = formatDateFull(req.endDate);
    document.getElementById('sheetDuration').textContent  = `${req.days} day${req.days > 1 ? 's' : ''}`;
    document.getElementById('sheetHours').textContent     = `${req.hoursPerDay} hrs`;
    document.getElementById('sheetBookingId').textContent = req.bookingId;

    // Cost
    document.getElementById('sheetRate').textContent  = `₹${req.hourlyRate}/hr`;
    document.getElementById('sheetCalc').textContent  = `${req.hoursPerDay}h × ${req.days}d`;
    document.getElementById('sheetTotal').textContent = `₹${req.totalCost.toLocaleString('en-IN')}`;

    // Countdown
    const cdBar = document.getElementById('sheetCountdown');
    cdBar.className = `countdown-bar ${countdown.cls}`;
    document.getElementById('sheetCountdownText').textContent = countdown.long;
    cdBar.style.display = '';

    // Show/hide action buttons vs actioned notice
    const actionsEl  = document.getElementById('sheetActions');
    const noticedEl  = document.getElementById('actionedNotice');

    if (isPending) {
        actionsEl.style.display  = 'flex';
        noticedEl.style.display  = 'none';
    } else {
        actionsEl.style.display  = 'none';
        noticedEl.style.display  = 'flex';
        noticedEl.className      = `actioned-notice ${req.status === 'Confirmed' ? 'confirmed' : 'cancelled'}`;
        document.getElementById('actionedIcon').className = req.status === 'Confirmed'
            ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
        document.getElementById('actionedText').textContent = req.status === 'Confirmed'
            ? `Approved on ${formatDateFull(req.actionedAt?.slice(0,10) || req.startDate)} — Farmer has been notified.`
            : `Rejected on ${formatDateFull(req.actionedAt?.slice(0,10) || req.startDate)} — Farmer has been notified.`;
        cdBar.style.display = 'none';
    }

    document.getElementById('sheetOverlay').classList.add('active');
}

function closeSheet(e) {
    if (e && e.target !== document.getElementById('sheetOverlay')) return;
    closeSheetDirect();
}

function closeSheetDirect() {
    document.getElementById('sheetOverlay').classList.remove('active');
    activeReqId = null;
}

/* ══ APPROVE / REJECT — from sheet ══ */
function approveFromSheet() {
    if (!activeReqId) return;
    closeSheetDirect();
    triggerAction(activeReqId, 'approve');
}

function rejectFromSheet() {
    if (!activeReqId) return;
    closeSheetDirect();
    triggerAction(activeReqId, 'reject');
}

/* ══ TRIGGER ACTION — shows confirm dialog ══ */
function triggerAction(reqId, type) {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    pendingAction = { reqId, type };

    const isApprove = type === 'approve';
    document.getElementById('confirmIcon').textContent  = isApprove ? '✅' : '❌';
    document.getElementById('confirmTitle').textContent = isApprove ? 'Approve Booking?' : 'Reject Booking?';
    document.getElementById('confirmMsg').textContent   = isApprove
        ? `Confirm booking for ${req.farmerName} — ${req.equipName} (${formatDate(req.startDate)} → ${formatDate(req.endDate)}). Farmer will be notified.`
        : `Reject ${req.farmerName}'s request for ${req.equipName}? This cannot be undone. Farmer will be notified.`;

    const btn = document.getElementById('confirmActionBtn');
    btn.textContent = isApprove ? 'Yes, Approve' : 'Yes, Reject';
    btn.className   = `confirm-action-btn ${type === 'approve' ? 'approve' : 'reject'}`;

    document.getElementById('confirmOverlay').classList.add('active');
}

/* ══ EXECUTE ACTION (FR-4.4, FR-7.1) ══ */
function executeAction() {
    if (!pendingAction) return;

    const { reqId, type } = pendingAction;
    const idx = requests.findIndex(r => r.id === reqId);
    if (idx === -1) return;

    const req       = requests[idx];
    const newStatus = type === 'approve' ? 'Confirmed' : 'Cancelled';

    requests[idx] = {
        ...req,
        status:     newStatus,
        actionedAt: new Date().toISOString()
    };

    saveRequests();

    // ── FR-7.1: Cross-role notification — update farmer's booking status ──
    crossRoleNotify(req, newStatus);

    closeConfirm();
    renderAll();

    if (type === 'approve') {
        showToast('success', 'Booking Approved!',
            `${req.farmerName}'s request confirmed. ₹${req.totalCost.toLocaleString('en-IN')} earned. Farmer notified.`);
    } else {
        showToast('warning', 'Booking Rejected',
            `${req.farmerName}'s request has been cancelled. Farmer notified.`);
    }

    pendingAction = null;
}

/* ══ FR-7.1 — CROSS-ROLE NOTIFICATION ══
   Syncs the new status back to farmer's booking list in localStorage
   and logs a notification entry that the farmer app can read.         */
function crossRoleNotify(req, newStatus) {
    // 1. Update farmer-side booking status
    try {
        const farmerBookings = JSON.parse(localStorage.getItem(FARMER_BK_KEY) || '[]');
        const fi = farmerBookings.findIndex(b => b.bookingId === req.bookingId);
        if (fi !== -1) {
            farmerBookings[fi].status = newStatus;
            localStorage.setItem(FARMER_BK_KEY, JSON.stringify(farmerBookings));
        }
    } catch(e) { /* silent */ }

    // 2. Push notification log for farmer
    try {
        const notifs = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
        notifs.unshift({
            notifId:   'NF' + Date.now(),
            userId:    'farmer_ramesh',              // target farmer
            type:      newStatus === 'Confirmed' ? 'booking_confirmed' : 'booking_cancelled',
            title:     newStatus === 'Confirmed' ? 'Booking Approved! ✅' : 'Booking Rejected ❌',
            message:   newStatus === 'Confirmed'
                ? `Your booking for ${req.equipName} (${formatDate(req.startDate)}–${formatDate(req.endDate)}) has been confirmed by ${req.equipName} owner.`
                : `Your booking for ${req.equipName} (${formatDate(req.startDate)}) has been rejected. Please try another date.`,
            bookingId: req.bookingId,
            channel:   ['push', 'sms'],              // FR-7.1 dispatch channels
            isRead:    false,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
    } catch(e) { /* silent */ }
}

function closeConfirm() {
    document.getElementById('confirmOverlay').classList.remove('active');
}

/* ══ SYNC TOGGLE ══ */
function toggleSync() {
    const ind    = document.getElementById('syncIndicator');
    const online = ind.classList.contains('online');
    ind.classList.toggle('online',   !online);
    ind.classList.toggle('offline',   online);
    showToast(
        online ? 'warning' : 'success',
        online ? 'Offline Mode' : 'Back Online',
        online
            ? 'Approve/reject actions queued. Will sync when reconnected.'
            : 'Syncing booking statuses and farmer notifications…'
    );
}

/* ══ HELPERS ══ */
function formatDate(d) {
    if (!d) return '—';
    const [,m,day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(m,10)-1]}`;
}

function formatDateFull(d) {
    if (!d) return '—';
    const [y,m,day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${day} ${months[parseInt(m,10)-1]} ${y}`;
}

/* ══ TOAST (FR-7.1) ══ */
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
    toast._t = setTimeout(() => toast.classList.remove('show'), 5000);
}
