/**
 * notification-prefs.js — KisanSetu Notification Preferences
 * FR-7.3: Users can customize notification preferences (opt-out of channels)
 *
 * INTEGRATION: This JS file is loaded by notification-prefs.html (standalone page).
 * It can also be imported from any dashboard:
 *
 *   <script type="module" src="../shared/notification-prefs.js"></script>
 *
 * DATA: Reads/writes `notification_preferences` table in Supabase.
 *       Falls back to localStorage if offline or table doesn't exist yet.
 *
 * SQL: Run once in Supabase SQL Editor (provided in supabase_migrations.sql):
 *   CREATE TABLE IF NOT EXISTS notification_preferences (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *     in_app         BOOLEAN DEFAULT true,
 *     order_alerts   BOOLEAN DEFAULT true,
 *     booking_alerts BOOLEAN DEFAULT true,
 *     price_alerts   BOOLEAN DEFAULT true,
 *     expiry_alerts  BOOLEAN DEFAULT true,
 *     email_marketing BOOLEAN DEFAULT true,
 *     updated_at     TIMESTAMPTZ DEFAULT now(),
 *     UNIQUE(user_id)
 *   );
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://ffigoosgvrtfgtgmrmxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWdvb3NndnJ0Zmd0Z21ybXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzY0NjYsImV4cCI6MjA5MDQxMjQ2Nn0.GjsvWC4eTGczrRsx3hCP5iuKPI_ZIVDY_YhD5U9RIdk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LS_KEY = 'ks_notif_prefs';

const DEFAULT_PREFS = {
    in_app:          true,
    order_alerts:    true,
    booking_alerts:  true,
    price_alerts:    true,
    expiry_alerts:   true,
    email_marketing: true,
};

let currentUser   = null;
let currentPrefs  = { ...DEFAULT_PREFS };
let isSaving      = false;

/* ── Load preferences ── */
async function loadPrefs() {
    // 1. Try Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!error && data) {
            currentPrefs = {
                in_app:          data.in_app          ?? true,
                order_alerts:    data.order_alerts    ?? true,
                booking_alerts:  data.booking_alerts  ?? true,
                price_alerts:    data.price_alerts    ?? true,
                expiry_alerts:   data.expiry_alerts   ?? true,
                email_marketing: data.email_marketing ?? true,
            };
            localStorage.setItem(LS_KEY, JSON.stringify(currentPrefs));
            return;
        }
    }

    // 2. Fall back to localStorage
    const local = localStorage.getItem(LS_KEY);
    if (local) {
        try { currentPrefs = { ...DEFAULT_PREFS, ...JSON.parse(local) }; } catch(_) {}
    }
}

/* ── Save preferences ── */
async function savePrefs(newPrefs) {
    currentPrefs = { ...currentPrefs, ...newPrefs };

    // Always save locally first
    localStorage.setItem(LS_KEY, JSON.stringify(currentPrefs));

    // Then try Supabase
    if (currentUser) {
        try {
            await supabase.from('notification_preferences').upsert({
                user_id:         currentUser.id,
                ...currentPrefs,
                updated_at:      new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (e) {
            console.warn('[NotifPrefs] Supabase save failed (saved to localStorage):', e.message);
        }
    }
}

/* ── Toggle handler (called from HTML toggles) ── */
window.togglePref = async function (key, el) {
    if (isSaving) return;
    isSaving = true;

    const newVal = el.checked;

    // in_app cannot be turned off (always on)
    if (key === 'in_app' && !newVal) {
        el.checked = true;
        npToast('In-app notifications must remain ON.', 'info');
        isSaving = false;
        return;
    }

    await savePrefs({ [key]: newVal });

    const label = el.closest('.np-row')?.querySelector('.np-label')?.textContent || key;
    npToast(`${newVal ? '✅' : '🔕'} "${label}" ${newVal ? 'enabled' : 'disabled'}.`, newVal ? 'success' : 'warning');
    isSaving = false;
};

/* ── Apply loaded prefs to UI toggles ── */
function applyPrefsToUI() {
    Object.entries(currentPrefs).forEach(([key, val]) => {
        const el = document.getElementById(`pref-${key}`);
        if (el) el.checked = val;
    });

    // in_app toggle: disable it (always on)
    const inApp = document.getElementById('pref-in_app');
    if (inApp) {
        inApp.disabled = true;
        inApp.parentElement?.setAttribute('title', 'In-app notifications cannot be disabled');
    }
}

/* ── Toast ── */
function npToast(msg, type = 'info') {
    const t = document.getElementById('np-toast');
    if (!t) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
        return;
    }
    const colors = { success:'#2e7d32', warning:'#e65100', error:'#c62828', info:'#1565c0' };
    t.textContent = msg;
    t.style.background = colors[type] || colors.info;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

/* ── Public API (for dashboard widgets) ── */

/** Returns whether a given notification type is enabled */
window.isNotifEnabled = function (key) {
    return currentPrefs[key] !== false;
};

/** Returns full prefs object */
window.getNotifPrefs = function () {
    return { ...currentPrefs };
};

/* ── Init (works both standalone page & dashboard import) ── */
document.addEventListener('DOMContentLoaded', async () => {
    await loadPrefs();
    applyPrefsToUI();

    // Update user info display if on the prefs page
    if (currentUser) {
        const emailEl = document.getElementById('np-user-email');
        if (emailEl) emailEl.textContent = currentUser.email;
    }

    console.log('[NotifPrefs] ✅ Preferences loaded:', currentPrefs);
});
