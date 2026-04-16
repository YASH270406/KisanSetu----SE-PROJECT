/**
 * session-timeout.js — KisanSetu 30-Minute Idle Session Timeout
 * NFR-5.3: 30-min session timeout (Supabase JWT auto-refresh does NOT enforce idle timeout)
 *
 * INTEGRATION: Add to ANY dashboard page that requires auth:
 *
 *   <script type="module" src="../shared/session-timeout.js"></script>
 *
 * Uses the same Supabase config as the rest of the app.
 * Shows a 60-second countdown warning before auto-logout.
 * Resets on ANY user interaction (mouse, keyboard, touch, scroll).
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL      = 'https://ffigoosgvrtfgtgmrmxz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaWdvb3NndnJ0Zmd0Z21ybXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzY0NjYsImV4cCI6MjA5MDQxMjQ2Nn0.GjsvWC4eTGczrRsx3hCP5iuKPI_ZIVDY_YhD5U9RIdk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const IDLE_TIMEOUT_MS    = 30 * 60 * 1000;   // 30 minutes
const WARNING_BEFORE_MS  = 60 * 1000;         // show warning 60 sec before logout

let idleTimer      = null;
let warningTimer   = null;
let countdownTimer = null;
let warningActive  = false;

/* ── Inject Warning Toast UI ── */
function injectWarningUI() {
    if (document.getElementById('ks-session-warning')) return;

    const style = document.createElement('style');
    style.textContent = `
        #ks-session-warning {
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            background: #b71c1c; color: white; border-radius: 14px;
            padding: 16px 24px; z-index: 99999; display: none;
            box-shadow: 0 8px 30px rgba(0,0,0,0.35);
            font-family: 'Poppins', 'DM Sans', sans-serif;
            max-width: 360px; width: 90%; text-align: center;
            animation: ks-slide-up 0.4s ease;
        }
        @keyframes ks-slide-up {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        #ks-session-warning .ks-warn-title {
            font-weight: 700; font-size: 1rem; margin-bottom: 4px;
        }
        #ks-session-warning .ks-warn-msg {
            font-size: 0.85rem; opacity: 0.9; margin-bottom: 12px;
        }
        #ks-session-warning .ks-warn-count {
            font-size: 1.8rem; font-weight: 700; letter-spacing: 1px;
        }
        #ks-session-warning .ks-btn-stay {
            margin-top: 12px; background: white; color: #b71c1c;
            border: none; border-radius: 8px; padding: 8px 22px;
            font-weight: 700; font-size: 0.9rem; cursor: pointer;
            width: 100%; transition: background 0.2s;
        }
        #ks-session-warning .ks-btn-stay:hover { background: #ffcdd2; }
    `;
    document.head.appendChild(style);

    const box = document.createElement('div');
    box.id = 'ks-session-warning';
    box.innerHTML = `
        <div class="ks-warn-title">⏱️ Session Expiring</div>
        <div class="ks-warn-msg">You've been inactive. You will be logged out in:</div>
        <div class="ks-warn-count" id="ks-countdown">60</div>
        <button class="ks-btn-stay" onclick="window.ksStayLoggedIn()">Stay Logged In</button>
    `;
    document.body.appendChild(box);
}

/* ── Show / hide warning ── */
function showWarning() {
    warningActive = true;
    const box = document.getElementById('ks-session-warning');
    if (box) box.style.display = 'block';

    let remaining = Math.round(WARNING_BEFORE_MS / 1000);
    const el = document.getElementById('ks-countdown');
    if (el) el.textContent = remaining;

    countdownTimer = setInterval(() => {
        remaining--;
        if (el) el.textContent = remaining;
        if (remaining <= 0) clearInterval(countdownTimer);
    }, 1000);
}

function hideWarning() {
    warningActive = false;
    clearInterval(countdownTimer);
    const box = document.getElementById('ks-session-warning');
    if (box) box.style.display = 'none';
}

/* ── Logout ── */
async function performLogout() {
    hideWarning();
    console.log('[SessionTimeout] Logging out due to inactivity.');
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/index.html';
}

/* ── Reset idle timer (called on any user activity) ── */
function resetIdleTimer() {
    // If warning is showing, dismiss it
    if (warningActive) hideWarning();

    clearTimeout(idleTimer);
    clearTimeout(warningTimer);

    // Set warning timer: fires 60 seconds before logout
    warningTimer = setTimeout(() => {
        showWarning();
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Set logout timer
    idleTimer = setTimeout(async () => {
        await performLogout();
    }, IDLE_TIMEOUT_MS);
}

/* ── Public: let user stay ── */
window.ksStayLoggedIn = function () {
    resetIdleTimer();
    // Optional: silently refresh Supabase session
    supabase.auth.getSession();
};

/* ── Attach activity listeners ── */
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

function attachListeners() {
    ACTIVITY_EVENTS.forEach(evt =>
        document.addEventListener(evt, resetIdleTimer, { passive: true })
    );
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
    // Only activate if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Not logged in — no timeout needed

    injectWarningUI();
    attachListeners();
    resetIdleTimer(); // Start the clock

    console.log(`[SessionTimeout] ✅ Active — will logout after ${IDLE_TIMEOUT_MS / 60000} min of inactivity.`);
});
