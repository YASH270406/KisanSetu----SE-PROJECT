/**
 * booking_requests_supabase.js — KisanSetu Equipment Owner: Live Supabase Connector
 * FR-4.4: Owner approves / rejects booking — writes to Supabase, not localStorage only.
 * FR-7.1: Real cross-role notification via Supabase notifications table.
 *
 * INTEGRATION: This is a new ES module. Add AFTER booking_requests.js in the HTML:
 *
 *   <script type="module" src="booking_requests_supabase.js"></script>
 *
 * HOW IT WORKS:
 *   1. On load: fetches THIS owner's bookings from Supabase and patches window.requests
 *   2. Overrides window.executeAction so that Approve/Reject writes to Supabase
 *   3. Falls back to localStorage demo data if Supabase is unreachable
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL     = 'https://ffigoosgvrtfgtgmrmxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWdvb3NndnJ0Zmd0Z21ybXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzY0NjYsImV4cCI6MjA5MDQxMjQ2Nn0.GjsvWC4eTGczrRsx3hCP5iuKPI_ZIVDY_YhD5U9RIdk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentOwnerId = null;

/* ──────────────────────────────────────────────── 
   MAP Supabase booking row → shape expected by
   the existing booking_requests.js render functions
──────────────────────────────────────────────── */
function mapBookingRow(b) {
    const now = Date.now();
    const createdAt = b.created_at ? new Date(b.created_at) : new Date();
    const deadline  = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24-hr window

    const status =
        b.status === 'Confirmed' || b.status === 'Approved' ? 'Confirmed' :
        b.status === 'Cancelled' || b.status === 'Rejected'  ? 'Cancelled' : 'Pending';

    const farmerName = b.farmer?.full_name || 'Unknown Farmer';
    const initials   = farmerName.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

    return {
        id:             b.id,
        bookingId:      b.id,
        farmerName,
        farmerPhone:    b.farmer?.phone || '—',
        farmerVillage:  b.farmer?.state || '—',
        farmerInitials: initials,
        equipId:        b.equipment_id,
        equipName:      b.equipment?.name || 'Equipment',
        equipEmoji:     '🚜',
        equipModel:     b.equipment?.model || b.equipment?.name || '—',
        hourlyRate:     b.equipment?.hourly_rate || 0,
        startDate:      b.start_date || b.created_at?.slice(0, 10),
        endDate:        b.end_date   || b.created_at?.slice(0, 10),
        days:           b.total_days || 1,
        hoursPerDay:    b.hours_per_day || 8,
        totalCost:      b.total_cost || 0,
        purpose:        b.purpose || '—',
        status,
        receivedAt: createdAt.toISOString(),
        deadline:   deadline.toISOString(),
        _liveData:  true
    };
}

/* ──────────────────────────────────────────────── 
   LOAD BOOKINGS for the current logged-in owner
──────────────────────────────────────────────── */
async function loadLiveBookings() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        console.warn('[BookingRequests] Not logged in — using localStorage demo data.');
        return false;
    }
    currentOwnerId = user.id;

    // Fetch bookings for equipment owned by this user
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            id, status, start_date, end_date, total_cost, total_days,
            hours_per_day, purpose, created_at, equipment_id,
            farmer:farmer_id ( id, full_name, phone, state ),
            equipment:equipment_id ( id, name, model, hourly_rate, owner_id )
        `)
        .eq('equipment.owner_id', currentOwnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('[BookingRequests] Supabase query failed — using demo data.', error.message);
        return false;
    }

    if (!data || data.length === 0) {
        console.log('[BookingRequests] No bookings found in Supabase — keeping demo data.');
        return false;
    }

    // Patch the global `requests` array used by existing booking_requests.js
    const mapped = data.map(mapBookingRow);
    if (typeof window !== 'undefined' && Array.isArray(window.requests)) {
        window.requests.length = 0;
        mapped.forEach(r => window.requests.push(r));
    }

    console.log(`[BookingRequests] ✅ Loaded ${mapped.length} live bookings from Supabase.`);
    return true;
}

/* ──────────────────────────────────────────────── 
   OVERRIDE executeAction — write to Supabase
──────────────────────────────────────────────── */
const _originalExecuteAction = window.executeAction;

window.executeAction = async function() {
    // Read the pending action the original script set up
    const pendingAction = window.pendingAction;
    if (!pendingAction) return;

    const { reqId, type } = pendingAction;
    const req = (window.requests || []).find(r => r.id === reqId);
    if (!req) {
        // Fallback to original if not found
        if (_originalExecuteAction) _originalExecuteAction();
        return;
    }

    const newStatus = type === 'approve' ? 'Confirmed' : 'Cancelled';

    // If it's live data, write to Supabase first
    if (req._liveData) {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({
                    status:      newStatus,
                    actioned_at: new Date().toISOString()
                })
                .eq('id', reqId);

            if (error) throw error;

            // Send real notification to the farmer (FR-7.1)
            if (req.farmer?.id || req._farmerId) {
                const farmerId = req._farmerId || req.farmer?.id;
                await supabase.from('notifications').insert({
                    user_id: farmerId,
                    title:   newStatus === 'Confirmed' ? '✅ Booking Approved!' : '❌ Booking Rejected',
                    message: newStatus === 'Confirmed'
                        ? `Your booking for ${req.equipName} (${req.startDate} – ${req.endDate}) has been confirmed. Total: ₹${req.totalCost.toLocaleString('en-IN')}.`
                        : `Your booking for ${req.equipName} on ${req.startDate} was rejected. Please try another date.`,
                    type: newStatus === 'Confirmed' ? 'success' : 'warning'
                });
            }

            console.log(`[BookingRequests] ✅ Booking ${reqId} ${newStatus} in Supabase.`);
        } catch (err) {
            console.error('[BookingRequests] Supabase update failed:', err.message);
            showToast('Failed to sync with server. Action saved locally.', 'warning');
        }
    }

    // Let the original function handle local state + UI refresh
    if (_originalExecuteAction) _originalExecuteAction();
};

/* ──────────────────────────────────────────────── 
   REALTIME SUBSCRIPTION — live booking updates
──────────────────────────────────────────────── */
function subscribeToBookingUpdates() {
    supabase
        .channel('booking-requests-realtime')
        .on('postgres_changes', {
            event:  '*',
            schema: 'public',
            table:  'bookings'
        }, async (payload) => {
            console.log('[BookingRequests] Realtime update:', payload.eventType);
            const loaded = await loadLiveBookings();
            if (loaded && typeof renderAll === 'function') {
                renderAll();
                showToast('Booking list updated in real-time.', 'info');
            }
        })
        .subscribe();
}

/* ──────────────────────────────────────────────── 
   INIT
──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Wait a tick so booking_requests.js loads its demo data first
    await new Promise(r => setTimeout(r, 100));

    const loaded = await loadLiveBookings();
    if (loaded) {
        // Refresh the UI with live data
        if (typeof renderAll === 'function') renderAll();
        subscribeToBookingUpdates();
        console.log('[BookingRequests] ✅ Live mode active.');
    } else {
        console.log('[BookingRequests] ℹ️ Running in demo/offline mode.');
    }
});
