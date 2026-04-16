/**
 * rental_calendar_supabase.js — KisanSetu Rental Calendar Live Supabase Connector
 * FR-4.2: Calendar interface showing real availability from Supabase bookings table.
 *
 * INTEGRATION: Add AFTER rental_calendar_earnings.js in the HTML:
 *
 *   <script type="module" src="rental_calendar_supabase.js"></script>
 *
 * HOW IT WORKS:
 *   1. Fetches this owner's equipment fleet from Supabase `equipment` table
 *   2. Fetches this owner's bookings from Supabase `bookings` table
 *   3. Patches window.fleet and window.allRequests used by the existing calendar JS
 *   4. Triggers a calendar re-render with live data
 *   5. Falls back gracefully to existing demo data if Supabase is unreachable
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://ffigoosgvrtfgtgmrmxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWdvb3NndnJ0Zmd0Z21ybXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzY0NjYsImV4cCI6MjA5MDQxMjQ2Nn0.GjsvWC4eTGczrRsx3hCP5iuKPI_ZIVDY_YhD5U9RIdk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ──────────────────────────────────────────────── 
   EQUIPMENT ROW → calendar fleet shape
──────────────────────────────────────────────── */
function mapEquipment(e) {
    // Pick an emoji based on equipment type keyword
    const typeEmoji = {
        tractor:    '🚜', seeder: '🌱', drill: '🌱', tiller: '⚙️',
        harvester:  '🌾', pump:   '💧', sprayer: '🌿', default: '🔧'
    };
    const lower  = (e.name || '').toLowerCase();
    const emoji  = Object.entries(typeEmoji).find(([k]) => lower.includes(k))?.[1] || '🔧';

    return {
        id:     e.id,
        name:   e.name || 'Equipment',
        emoji,
        type:   e.equipment_type || e.name || 'Machine',
        status: e.status || 'Available',
        _liveData: true
    };
}

/* ──────────────────────────────────────────────── 
   BOOKING ROW → calendar allRequests shape
──────────────────────────────────────────────── */
function mapBookingForCalendar(b) {
    const farmerName = b.farmer?.full_name || 'Unknown Farmer';
    const equipName  = b.equipment?.name   || 'Equipment';

    const status =
        b.status === 'Confirmed' || b.status === 'Approved' ? 'Confirmed' :
        b.status === 'Cancelled' || b.status === 'Rejected'  ? 'Cancelled' : 'Confirmed';

    return {
        id:           b.id,
        bookingId:    b.id,
        equipId:      b.equipment_id,
        equipName,
        equipEmoji:   '🚜',
        equipModel:   b.equipment?.model || equipName,
        farmerName,
        farmerPhone:  b.farmer?.phone || '—',
        farmerVillage:b.farmer?.state || '—',
        startDate:    b.start_date,
        endDate:      b.end_date || b.start_date,
        days:         b.total_days || 1,
        hoursPerDay:  b.hours_per_day || 8,
        hourlyRate:   b.equipment?.hourly_rate || 0,
        totalCost:    b.total_cost || 0,
        purpose:      b.purpose || '—',
        status,
        _liveData: true
    };
}

/* ──────────────────────────────────────────────── 
   LOAD FLEET + BOOKINGS
──────────────────────────────────────────────── */
async function loadCalendarData() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        console.warn('[RentalCalendar] Not logged in — using localStorage demo data.');
        return false;
    }

    // Fetch fleet
    const { data: equipData, error: equipErr } = await supabase
        .from('equipment')
        .select('id, name, model, equipment_type, status, hourly_rate')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

    if (equipErr) {
        console.warn('[RentalCalendar] Fleet fetch failed:', equipErr.message);
        return false;
    }

    // Fetch bookings for this owner's equipment
    const equipIds = equipData?.map(e => e.id) || [];
    let bookingData = [];

    if (equipIds.length > 0) {
        const { data: bData, error: bErr } = await supabase
            .from('bookings')
            .select(`
                id, status, start_date, end_date, total_cost, total_days,
                hours_per_day, purpose, equipment_id,
                farmer:farmer_id ( id, full_name, phone, state ),
                equipment:equipment_id ( id, name, model, hourly_rate )
            `)
            .in('equipment_id', equipIds)
            .neq('status', 'Cancelled')
            .order('start_date', { ascending: true });

        if (bErr) {
            console.warn('[RentalCalendar] Bookings fetch failed:', bErr.message);
        } else {
            bookingData = bData || [];
        }
    }

    // Patch globals used by rental_calendar_earnings.js
    if (equipData && equipData.length > 0) {
        window.fleet = equipData.map(mapEquipment);
        console.log(`[RentalCalendar] ✅ Loaded ${window.fleet.length} equipment items from Supabase.`);
    }

    if (bookingData.length > 0) {
        window.allRequests = bookingData.map(mapBookingForCalendar);
        console.log(`[RentalCalendar] ✅ Loaded ${window.allRequests.length} bookings from Supabase.`);
    }

    return true;
}

/* ──────────────────────────────────────────────── 
   REALTIME — re-render calendar on new bookings
──────────────────────────────────────────────── */
function subscribeToCalendarUpdates() {
    supabase
        .channel('rental-calendar-realtime')
        .on('postgres_changes', {
            event:  '*',
            schema: 'public',
            table:  'bookings'
        }, async () => {
            const loaded = await loadCalendarData();
            if (loaded) {
                if (typeof buildAssetChips === 'function') buildAssetChips();
                if (typeof renderCalendar  === 'function') renderCalendar();
                if (typeof renderEarnings  === 'function') renderEarnings();
                console.log('[RentalCalendar] 🔄 Calendar refreshed via realtime.');
            }
        })
        .subscribe();
}

/* ──────────────────────────────────────────────── 
   SAVE BLOCKED DATES to Supabase (bonus feature)
   Persists blocked dates to a `equipment_blocked_dates` table
   if it exists, otherwise falls back to localStorage.
──────────────────────────────────────────────── */
window.saveBlockedDateToSupabase = async function(entry) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('equipment_blocked_dates').insert({
            owner_id:   user.id,
            equipment_id: entry.assetId || null,
            from_date:  entry.from,
            to_date:    entry.to,
            reason:     entry.reason
        });
        console.log('[RentalCalendar] Blocked dates saved to Supabase.');
    } catch (e) {
        // Table may not exist yet — silently continue with localStorage
        console.warn('[RentalCalendar] Could not save blocked dates to Supabase:', e.message);
    }
};

/* ──────────────────────────────────────────────── 
   INIT
──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for rental_calendar_earnings.js to finish its DOMContentLoaded handler
    await new Promise(r => setTimeout(r, 150));

    const loaded = await loadCalendarData();
    if (loaded) {
        // Re-render everything with live data
        if (typeof buildAssetChips === 'function') buildAssetChips();
        if (typeof renderCalendar  === 'function') renderCalendar();
        if (typeof renderBlockedList === 'function') renderBlockedList();
        if (typeof renderEarnings  === 'function') renderEarnings();

        subscribeToCalendarUpdates();
        console.log('[RentalCalendar] ✅ Live mode active.');
    } else {
        console.log('[RentalCalendar] ℹ️ Running in demo/offline mode.');
    }
});
