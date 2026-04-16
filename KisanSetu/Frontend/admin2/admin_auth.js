import { supabase } from '../supabase-config.js';

/**
 * admin_auth.js — KisanSetu Admin Authentication Middleware
 * Ensures the user is logged in and has the 'Administrator' role.
 */

export async function checkAdminSession() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 1. Check if user is logged into Supabase
    if (authError || !user) {
        console.warn('[Admin Auth] No active session found.');
        handleUnauthorized();
        return null;
    }

    // 2. Fetch role from profiles to ensure they are an Administrator
    const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (dbError || !profile) {
        console.error('[Admin Auth] Failed to fetch profile:', dbError?.message);
        handleUnauthorized();
        return null;
    }

    const role = profile.role?.toLowerCase();
    const isAdmin = role === 'admin' || role === 'administrator';

    if (!isAdmin) {
        console.warn(`[Admin Auth] User ${user.email} has insufficient role: ${profile.role}`);
        handleUnauthorized();
        return null;
    }

    console.log(`[Admin Auth] Access granted to ${user.email} (${profile.role})`);
    return { user, profile };
}

function handleUnauthorized() {
    // Clear potentially stale session data
    sessionStorage.removeItem('kisansetu_session_active');
    sessionStorage.removeItem('kisansetu_user_role');

    // Redirect to login page
    const loginUrl = window.location.origin + '/Frontend/index.html';
    // If we are already on the login page or splash, don't redirect (prevent loops)
    if (!window.location.pathname.includes('index.html')) {
        alert('Unauthorized access. Please log in as an Admin.');
        window.location.href = loginUrl;
    }
}

// Global logout for admin panel
window.handleAdminLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    window.location.href = '../index.html';
};


// ── [NFR-5.3] Admin Session Idle Timeout (30 Minutes) ───────────────────────
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let idleTimer = null;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
        console.warn('[Admin Auth] Session timed out due to inactivity.');
        await supabase.auth.signOut();
        sessionStorage.clear();
        alert('Critical: Your session has expired due to 30 minutes of inactivity. Logging you out for security.');
        window.location.href = '../index.html';
    }, IDLE_TIMEOUT_MS);
}

// Start monitoring activity if session is validated
export function startIdleMonitoring() {
    console.log('[Admin Auth] Security monitoring started (30m idle timeout).');
    resetIdleTimer();
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
    });
}
