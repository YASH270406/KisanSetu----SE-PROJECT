/* ============================================
   rental_calendar_earnings.js
   KisanSetu — Rental Calendar + Earnings Report
   FR-4.2: Monthly grid calendar per asset,
           colour-coded Booked/Available/Maintenance,
           owner can block dates, tap booked day
           links to booking detail.
   FR-1.5: Earnings by asset.
   FR-7.2: Transaction history log per equipment.
   ============================================ */

'use strict';

/* ══ STORAGE KEYS ══ */
const FLEET_KEY    = 'ks_owner_fleet';
const REQUESTS_KEY = 'ks_booking_requests';
const BLOCKED_KEY  = 'ks_blocked_dates';

/* ══ MONTH/YEAR NAMES ══ */
const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ══ DEMO FLEET (fallback) ══ */
const DEMO_FLEET = [
    { id:'FL001', name:'Mahindra 575 DI',    emoji:'🚜', type:'Tractor',   status:'Available' },
    { id:'FL002', name:'Fieldking Seed Drill',emoji:'🌱', type:'Seed Drill',status:'Rented'    },
    { id:'FL003', name:'VST Power Tiller',   emoji:'⚙️', type:'Tiller',    status:'Maintenance'}
];

/* ══ DEMO BOOKING REQUESTS (fallback) ══ */
const DEMO_REQUESTS = [
    { id:'REQ001', bookingId:'BK001', equipId:'FL001', equipName:'Mahindra 575 DI',   equipEmoji:'🚜', equipModel:'Mahindra 575 DI XP Plus', farmerName:'Ramesh Kumar', farmerPhone:'9876543210', farmerVillage:'Sampla, Rohtak', startDate:'2025-04-03', endDate:'2025-04-04', days:2, hoursPerDay:8, hourlyRate:150, totalCost:2400, purpose:'Ploughing', status:'Confirmed' },
    { id:'REQ002', bookingId:'BK002', equipId:'FL001', equipName:'Mahindra 575 DI',   equipEmoji:'🚜', equipModel:'Mahindra 575 DI XP Plus', farmerName:'Sunil Yadav',   farmerPhone:'9812345678', farmerVillage:'Bahadurgarh', startDate:'2025-04-10', endDate:'2025-04-10', days:1, hoursPerDay:4, hourlyRate:150, totalCost:600,  purpose:'Seed Drilling', status:'Confirmed' },
    { id:'REQ003', bookingId:'BK003', equipId:'FL002', equipName:'Fieldking Seed Drill',equipEmoji:'🌱',equipModel:'Fieldking SDAM-9',        farmerName:'Deepak Singh',  farmerPhone:'9988776655', farmerVillage:'Meham',      startDate:'2025-04-15', endDate:'2025-04-15', days:1, hoursPerDay:8, hourlyRate:100, totalCost:800,  purpose:'Sowing', status:'Confirmed' },
    { id:'REQ004', bookingId:'BK004', equipId:'FL001', equipName:'Mahindra 575 DI',   equipEmoji:'🚜', equipModel:'Mahindra 575 DI XP Plus', farmerName:'Ajay Hooda',    farmerPhone:'9811223344', farmerVillage:'Kalanaur',   startDate:'2025-04-20', endDate:'2025-04-21', days:2, hoursPerDay:4, hourlyRate:150, totalCost:1200, purpose:'Transport', status:'Confirmed' },
    { id:'REQ005', bookingId:'BK005', equipId:'FL003', equipName:'VST Power Tiller',  equipEmoji:'⚙️', equipModel:'VST Shakti MT 130',       farmerName:'Mohan Devi',    farmerPhone:'9900112233', farmerVillage:'Asthal Bohar',startDate:'2025-04-25', endDate:'2025-04-25', days:1, hoursPerDay:8, hourlyRate:80,  totalCost:640,  purpose:'Tilling', status:'Cancelled' },
    { id:'REQ006', bookingId:'BK006', equipId:'FL001', equipName:'Mahindra 575 DI',   equipEmoji:'🚜', equipModel:'Mahindra 575 DI XP Plus', farmerName:'Ravi Sharma',   farmerPhone:'9870001234', farmerVillage:'Rohtak',     startDate:'2025-03-12', endDate:'2025-03-13', days:2, hoursPerDay:8, hourlyRate:150, totalCost:2400, purpose:'Ploughing', status:'Confirmed' },
    { id:'REQ007', bookingId:'BK007', equipId:'FL002', equipName:'Fieldking Seed Drill',equipEmoji:'🌱',equipModel:'Fieldking SDAM-9',        farmerName:'Anita Rani',    farmerPhone:'9899988877', farmerVillage:'Jhajjar',    startDate:'2025-03-20', endDate:'2025-03-20', days:1, hoursPerDay:8, hourlyRate:100, totalCost:800,  purpose:'Sowing', status:'Confirmed' },
    { id:'REQ008', bookingId:'BK008', equipId:'FL001', equipName:'Mahindra 575 DI',   equipEmoji:'🚜', equipModel:'Mahindra 575 DI XP Plus', farmerName:'Satbir Singh',  farmerPhone:'9812200001', farmerVillage:'Bhadurgarh', startDate:'2025-02-08', endDate:'2025-02-09', days:2, hoursPerDay:8, hourlyRate:150, totalCost:2400, purpose:'Harvesting', status:'Confirmed' },
    { id:'REQ009', bookingId:'BK009', equipId:'FL003', equipName:'VST Power Tiller',  equipEmoji:'⚙️', equipModel:'VST Shakti MT 130',       farmerName:'Kuldeep Mor',   farmerPhone:'9867777654', farmerVillage:'Rohtak',     startDate:'2025-02-18', endDate:'2025-02-18', days:1, hoursPerDay:4, hourlyRate:80,  totalCost:320,  purpose:'Tilling', status:'Confirmed' },
];

/* ══ STATE ══ */
let fleet         = [];
let allRequests   = [];
let blockedDates  = [];
let selectedAsset = 'all';    // 'all' or asset id

// Calendar
let calYear, calMonth;

// Earnings
let earnYear, earnMonth;

let chartInstance = null;
let popupBookingId = null;

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();

    // Calendar state — current month
    calYear  = now.getFullYear();
    calMonth = now.getMonth();

    // Earnings state — current month
    earnYear  = now.getFullYear();
    earnMonth = now.getMonth();

    // Load data
    fleet       = JSON.parse(localStorage.getItem(FLEET_KEY)    || 'null') || DEMO_FLEET;
    allRequests = JSON.parse(localStorage.getItem(REQUESTS_KEY) || 'null') || DEMO_REQUESTS;
    blockedDates = JSON.parse(localStorage.getItem(BLOCKED_KEY) || '[]');

    // Set min date for block form
    const today = now.toISOString().split('T')[0];
    document.getElementById('blockFrom').min = today;
    document.getElementById('blockTo').min   = today;

    buildAssetChips();
    renderCalendar();
    renderBlockedList();

    renderEarnings();
});

/* ══ PAGE SWITCHING ══ */
function switchPage(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.page-tab').forEach(b => b.classList.remove('active'));

    if (page === 'calendar') {
        document.getElementById('pageCal').classList.add('active');
        document.getElementById('tabCalBtn').classList.add('active');
        document.getElementById('pageTitle').textContent = 'Rental Calendar';
    } else {
        document.getElementById('pageEarn').classList.add('active');
        document.getElementById('tabEarnBtn').classList.add('active');
        document.getElementById('pageTitle').textContent = 'Earnings Report';
        renderEarnings(); // refresh chart
    }
}

/* ════════════════════════════════════════
   RENTAL CALENDAR  — FR-4.2
════════════════════════════════════════ */

/* Build asset selector chips */
function buildAssetChips() {
    const sel = document.getElementById('assetSelector');
    let html = `<button class="asset-chip active" onclick="selectAsset('all', this)">All Assets</button>`;
    fleet.forEach(a => {
        html += `<button class="asset-chip" onclick="selectAsset('${a.id}', this)">${a.emoji} ${a.name}</button>`;
    });
    sel.innerHTML = html;
}

function selectAsset(id, btn) {
    selectedAsset = id;
    document.querySelectorAll('.asset-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCalendar();
}

/* Navigation */
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

/* Render calendar grid */
function renderCalendar() {
    document.getElementById('calMonthName').textContent = MONTH_NAMES[calMonth];
    document.getElementById('calYear').textContent      = calYear;

    const grid     = document.getElementById('calGrid');
    const today    = new Date();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMo = new Date(calYear, calMonth + 1, 0).getDate();

    // Build booked days map: day → request
    const bookedMap = {};       // day → request object
    const maintDays = new Set();
    const blockedSet = new Set();

    // Maintenance days come from fleet status
    const maintAssets = fleet.filter(a => a.status === 'Maintenance');

    allRequests.forEach(req => {
        if (req.status !== 'Confirmed') return;
        if (selectedAsset !== 'all' && req.equipId !== selectedAsset) return;

        const s = new Date(req.startDate);
        const e = new Date(req.endDate);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
                bookedMap[d.getDate()] = req;
            }
        }
    });

    // Blocked dates
    blockedDates.forEach(b => {
        if (!b.assetId || selectedAsset === 'all' || b.assetId === selectedAsset) {
            const s = new Date(b.from);
            const e = new Date(b.to);
            for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
                    blockedSet.add(d.getDate());
                }
            }
        }
    });

    const dayHdrs = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let html = dayHdrs.map(d => `<div class="cal-day-hdr">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

    for (let d = 1; d <= daysInMo; d++) {
        const isToday = d === today.getDate() &&
                        calMonth === today.getMonth() &&
                        calYear  === today.getFullYear();
        const isPast  = new Date(calYear, calMonth, d) <
                        new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let cls    = 'cal-cell';
        let click  = '';
        let title  = '';

        if (isToday) {
            cls += ' today-cell';
        } else if (bookedMap[d]) {
            cls   += ' booked-cell';
            click  = `openBookingPopup('${bookedMap[d].id}')`;
            title  = `Booked: ${bookedMap[d].farmerName}`;
        } else if (blockedSet.has(d)) {
            cls   += ' blocked-cell';
            title  = 'Blocked';
        } else if (maintAssets.length > 0 && selectedAsset !== 'all' &&
                   maintAssets.find(a => a.id === selectedAsset)) {
            cls   += ' maint-cell';
            title  = 'Under Maintenance';
        } else if (isPast) {
            cls   += ' past';
        } else {
            cls   += ' free-cell';
        }

        html += `<div class="${cls}" title="${title}"
                      ${click ? `onclick="${click}"` : ''}>${d}</div>`;
    }

    grid.innerHTML = html;
}

/* ══ BLOCK DATES MANUALLY ══ */
function blockDates() {
    const from   = document.getElementById('blockFrom').value;
    const to     = document.getElementById('blockTo').value;
    const reason = document.getElementById('blockReason').value.trim() || 'Blocked by owner';

    if (!from) { showToast('error','Missing Date','Please select a start date.'); return; }
    if (!to || to < from) {
        document.getElementById('blockTo').value = from;
    }

    const entry = {
        id:      'BLK' + Date.now(),
        assetId: selectedAsset === 'all' ? null : selectedAsset,
        from,
        to:   document.getElementById('blockTo').value || from,
        reason
    };

    blockedDates.push(entry);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedDates));

    // Reset
    document.getElementById('blockFrom').value  = '';
    document.getElementById('blockTo').value    = '';
    document.getElementById('blockReason').value = '';

    renderCalendar();
    renderBlockedList();
    showToast('success', 'Dates Blocked', `${formatDate(entry.from)} → ${formatDate(entry.to)} blocked.`);
}

function unblockDate(id) {
    blockedDates = blockedDates.filter(b => b.id !== id);
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedDates));
    renderCalendar();
    renderBlockedList();
    showToast('warning', 'Dates Unblocked', 'Those dates are now available for booking.');
}

function renderBlockedList() {
    const list = document.getElementById('blockedList');
    const relevant = selectedAsset === 'all'
        ? blockedDates
        : blockedDates.filter(b => !b.assetId || b.assetId === selectedAsset);

    if (relevant.length === 0) {
        list.innerHTML = `<p style="font-size:0.75rem;color:var(--charcoal-lt);text-align:center;padding:10px 0">No dates blocked yet.</p>`;
        return;
    }

    list.innerHTML = relevant.map(b => `
        <div class="blocked-item">
            <div class="blocked-item-left">
                <span class="blocked-dates"><i class="fa-solid fa-lock" style="font-size:0.7rem;color:var(--steel)"></i>
                    ${formatDate(b.from)}${b.from !== b.to ? ' → ' + formatDate(b.to) : ''}</span>
                <span class="blocked-reason">${b.reason}</span>
            </div>
            <button class="btn-unblock" onclick="unblockDate('${b.id}')">Unblock</button>
        </div>
    `).join('');
}

/* ══ BOOKING DETAIL POPUP (tap booked day) ══ */
function openBookingPopup(reqId) {
    const req = allRequests.find(r => r.id === reqId);
    if (!req) return;
    popupBookingId = reqId;

    document.getElementById('popupTitle').textContent = `#${req.bookingId}`;

    document.getElementById('popupBody').innerHTML = `
        <div class="popup-eq-banner">
            <div class="popup-eq-emoji">${req.equipEmoji}</div>
            <div>
                <div class="popup-eq-name">${req.equipName}</div>
                <div class="popup-eq-meta">${req.equipModel}</div>
            </div>
        </div>

        <div class="popup-info-grid">
            <div class="popup-info-cell">
                <div class="popup-info-lbl">Farmer</div>
                <div class="popup-info-val">${req.farmerName}</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">Phone</div>
                <div class="popup-info-val">${req.farmerPhone}</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">From</div>
                <div class="popup-info-val">${formatDateFull(req.startDate)}</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">To</div>
                <div class="popup-info-val">${formatDateFull(req.endDate)}</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">Duration</div>
                <div class="popup-info-val">${req.days} day${req.days > 1 ? 's' : ''}</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">Hours/Day</div>
                <div class="popup-info-val">${req.hoursPerDay} hrs</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">Purpose</div>
                <div class="popup-info-val">${req.purpose || '—'}</div>
            </div>
            <div class="popup-info-cell">
                <div class="popup-info-lbl">Status</div>
                <div class="popup-info-val" style="color:var(--primary-green)">${req.status}</div>
            </div>
        </div>

        <div class="popup-total">
            <span>Total Earned</span>
            <span>₹${req.totalCost.toLocaleString('en-IN')}</span>
        </div>
    `;

    document.getElementById('popupOverlay').classList.add('active');
}

function closePopup(e) {
    if (e && e.target !== document.getElementById('popupOverlay')) return;
    closePopupDirect();
}
function closePopupDirect() {
    document.getElementById('popupOverlay').classList.remove('active');
}

/* ════════════════════════════════════════
   EARNINGS REPORT  — FR-1.5 + FR-7.2
════════════════════════════════════════ */

function prevEarnMonth() {
    earnMonth--;
    if (earnMonth < 0) { earnMonth = 11; earnYear--; }
    renderEarnings();
}

function nextEarnMonth() {
    earnMonth++;
    if (earnMonth > 11) { earnMonth = 0; earnYear++; }
    renderEarnings();
}

function renderEarnings() {
    document.getElementById('earnMonthLabel').textContent =
        `${MONTH_NAMES[earnMonth]} ${earnYear}`;

    // Filter confirmed requests for selected month
    const monthReqs = allRequests.filter(r => {
        if (r.status !== 'Confirmed') return false;
        const d = new Date(r.startDate);
        return d.getFullYear() === earnYear && d.getMonth() === earnMonth;
    });

    // Summary
    const totalEarned = monthReqs.reduce((s, r) => s + r.totalCost, 0);
    const totalDays   = monthReqs.reduce((s, r) => s + r.days, 0);

    // Top asset by earnings
    const assetEarnings = {};
    monthReqs.forEach(r => {
        assetEarnings[r.equipId] = (assetEarnings[r.equipId] || 0) + r.totalCost;
    });
    const topAssetId  = Object.keys(assetEarnings).sort((a,b) => assetEarnings[b] - assetEarnings[a])[0];
    const topAsset    = fleet.find(a => a.id === topAssetId);

    document.getElementById('earnTotal').textContent   = `₹${totalEarned.toLocaleString('en-IN')}`;
    document.getElementById('earnRentals').textContent = monthReqs.length;
    document.getElementById('earnDays').textContent    = totalDays;
    document.getElementById('earnSubLine').textContent = `${monthReqs.length} rental${monthReqs.length !== 1 ? 's' : ''} this month`;
    document.getElementById('earnTopAsset').textContent = topAsset
        ? `${topAsset.emoji} ${topAsset.name.split(' ').slice(0,2).join(' ')}`
        : '—';

    renderBarChart();
    renderAssetBreakdown(monthReqs, assetEarnings, totalEarned);
    renderTxnHistory();
}

/* Bar chart — last 6 months (Chart.js) */
function renderBarChart() {
    const labels  = [];
    const values  = [];

    for (let i = 5; i >= 0; i--) {
        let m = earnMonth - i;
        let y = earnYear;
        if (m < 0) { m += 12; y--; }

        labels.push(SHORT_MONTHS[m]);
        const sum = allRequests
            .filter(r => {
                if (r.status !== 'Confirmed') return false;
                const d = new Date(r.startDate);
                return d.getFullYear() === y && d.getMonth() === m;
            })
            .reduce((s, r) => s + r.totalCost, 0);
        values.push(sum);
    }

    const ctx = document.getElementById('earningsChart').getContext('2d');

    if (chartInstance) { chartInstance.destroy(); }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Earnings (₹)',
                data: values,
                backgroundColor: values.map((v, i) =>
                    i === 5
                        ? '#2e7d32'                     // current month — solid green
                        : 'rgba(46,125,50,0.25)'        // past months — muted
                ),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Poppins', size: 11 }, color: '#546e7a' }
                },
                y: {
                    grid: { color: '#e8f5e9' },
                    ticks: {
                        font: { family: 'Poppins', size: 10 }, color: '#546e7a',
                        callback: v => v >= 1000 ? `₹${v/1000}k` : `₹${v}`
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

/* Earnings breakdown by asset */
function renderAssetBreakdown(monthReqs, assetEarnings, totalEarned) {
    const cont = document.getElementById('assetBreakdown');
    if (Object.keys(assetEarnings).length === 0) {
        cont.innerHTML = `<p style="font-size:0.78rem;color:var(--charcoal-lt);text-align:center;padding:16px 0">No earnings this month.</p>`;
        return;
    }

    const sorted = Object.entries(assetEarnings).sort((a,b) => b[1] - a[1]);

    cont.innerHTML = sorted.map(([assetId, earned]) => {
        const asset   = fleet.find(a => a.id === assetId);
        const pct     = totalEarned > 0 ? Math.round((earned / totalEarned) * 100) : 0;
        const rentals = monthReqs.filter(r => r.equipId === assetId).length;
        const days    = monthReqs.filter(r => r.equipId === assetId).reduce((s,r)=>s+r.days,0);

        return `
        <div class="asset-earn-row">
            <div class="aer-top">
                <span class="aer-name">${asset ? asset.emoji : '🔧'} ${asset ? asset.name : assetId}</span>
                <span class="aer-amt">₹${earned.toLocaleString('en-IN')}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="aer-meta">${rentals} rental${rentals!==1?'s':''} · ${days} day${days!==1?'s':''} · ${pct}% of total</div>
        </div>`;
    }).join('');
}

/* Transaction history log — FR-7.2 */
function renderTxnHistory() {
    const list = document.getElementById('txnList');

    // All requests (not just this month) sorted newest first
    const sorted = [...allRequests].sort((a,b) =>
        new Date(b.startDate) - new Date(a.startDate)
    );

    document.getElementById('txnCount').textContent = `${sorted.length} records`;

    if (sorted.length === 0) {
        list.innerHTML = `<div class="txn-empty"><div class="e-icon">📭</div>No transactions yet.</div>`;
        return;
    }

    list.innerHTML = sorted.map(r => {
        const isConfirmed = r.status === 'Confirmed';
        return `
        <div class="txn-row">
            <div class="txn-icon ${isConfirmed ? 'confirmed' : 'cancelled'}">
                ${r.equipEmoji || '🚜'}
            </div>
            <div class="txn-info">
                <div class="txn-farmer">${r.farmerName}</div>
                <div class="txn-detail">${r.equipName} · ${formatDate(r.startDate)}${r.days>1?' → '+formatDate(r.endDate):''} · ${r.days}d</div>
            </div>
            <div class="txn-right">
                <span class="txn-amount ${isConfirmed ? 'earned' : 'lost'}">
                    ${isConfirmed ? '+' : '–'}₹${r.totalCost.toLocaleString('en-IN')}
                </span>
                <span class="txn-date">${formatDateFull(r.startDate)}</span>
            </div>
        </div>`;
    }).join('');
}

/* ══ SYNC TOGGLE ══ */
function toggleSync() {
    const ind    = document.getElementById('syncIndicator');
    const online = ind.classList.contains('online');
    ind.classList.toggle('online',  !online);
    ind.classList.toggle('offline',  online);
    showToast(
        online ? 'warning' : 'success',
        online ? 'Offline Mode' : 'Back Online',
        online ? 'Calendar changes saved locally.' : 'Syncing calendar and earnings…'
    );
}

/* ══ HELPERS ══ */
function formatDate(d) {
    if (!d) return '—';
    const [,m,day] = d.split('-');
    return `${day} ${SHORT_MONTHS[parseInt(m,10)-1]}`;
}

function formatDateFull(d) {
    if (!d) return '—';
    const [y,m,day] = d.split('-');
    return `${day} ${SHORT_MONTHS[parseInt(m,10)-1]} ${y}`;
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
