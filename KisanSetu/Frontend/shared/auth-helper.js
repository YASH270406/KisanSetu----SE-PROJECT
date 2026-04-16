import { supabase } from '../supabase-config.js';

/**
 * Standardizes the greeting, profile image, location and Logout functionality
 * across all role-based dashboards. Pulls real data from Supabase `users` table.
 */
export async function initializeDashboard(role) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // 1. Attempt to fetch real profile from 'users' table (includes profile_image & pincode)
    let profile = null;
    const CACHE_KEY = `ks_profile_${user.id}`;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('full_name, role, profile_image, pincode')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        profile = data;
        
        // Save to cache on success
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            ...profile,
            timestamp: Date.now()
        }));
    } catch (err) {
        console.warn("Network error or profile fetch failed. Attempting to load from cache...", err);
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            profile = JSON.parse(cached);
            profile.isCached = true;
        }
    }

    // Fallback to auth metadata if DB profile is missing
    if (!profile || !profile.full_name || profile.full_name === 'User') {
        const metadata = user.user_metadata;
        if (metadata && metadata.full_name) {
            profile = { 
                full_name: metadata.full_name, 
                role: metadata.role || role,
                pincode: metadata.pincode || null,
                profile_image: null,
                isFromMetadata: true 
            };
        } else {
            console.error("No profile or metadata found.");
            profile = { full_name: 'User', role: role, profile_image: null, pincode: null };
        }
    }

    // Security Check: Verify role matches dashboard (if not cached/offline)
    if (profile.role !== role && role !== 'Any' && !profile.isCached) {
        console.error("Unauthorized access to dashboard for role:", profile.role);
        window.location.href = '../index.html';
        return;
    }

    // 2. Update Greeting
    const greeting = document.querySelector('.greeting');
    if (greeting) {
        const firstName = profile.full_name.split(' ')[0];
        greeting.innerText = role === 'Farmer' ? `Namaste, ${firstName}!` : `Welcome, ${firstName}`;
        
        if (profile.isCached) {
            const badge = document.createElement('span');
            badge.className = 'offline-badge sync-pulse';
            badge.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Offline Mode';
            greeting.parentNode.appendChild(badge);
        }
    }

    // 3. Update Profile Picture with user's registered image
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) {
        if (profile.profile_image) {
            profilePic.src = profile.profile_image;
            profilePic.onerror = function () {
                // Fallback to a generated avatar if URL is broken
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=2e7d32&color=fff&size=100&rounded=true&bold=true`;
                this.onerror = null;
            };
        } else {
            // No image uploaded — use name-based avatar
            profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=2e7d32&color=fff&size=100&rounded=true&bold=true`;
            profilePic.onerror = null;
        }
        profilePic.alt = profile.full_name;
        profilePic.title = profile.full_name;
    }

    // 4. Update Location from pincode (show pincode-based location)
    const locationEl = document.querySelector('.location');
    if (locationEl && profile.pincode) {
        const icon = locationEl.querySelector('i');
        locationEl.innerHTML = '';
        if (icon) locationEl.appendChild(icon);
        locationEl.append(` Pincode: ${profile.pincode}`);
    }

    // 5. Inject Logout Button if not present
    setupLogoutButton();

    return { user, profile };
}

function setupLogoutButton() {
    const header = document.querySelector('.dashboard-header');
    if (!header) return;

    // Check if logout already exists
    if (document.getElementById('btn-logout')) return;

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'btn-logout';
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Logout';
    logoutBtn.title = 'Secure Logout';
    
    logoutBtn.onclick = async () => {
        const confirmLogout = confirm("Are you sure you want to logout? This will also clear all cached profile data.");
        if (confirmLogout) {
            // 1. Sign out from Supabase (Clears session)
            await supabase.auth.signOut();
            
            // 2. Forcefully wipe all local storage to ensure identity leaks are avoided (NFR-5.3)
            localStorage.clear();
            sessionStorage.clear();

            // 3. Forcefully return to the main landing page (Absolute Root index.html)
            // This is the most reliable way to handle logouts from any folder depth
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 100);
        }
    };

    header.appendChild(logoutBtn);
}
