import { supabase } from '../supabase-config.js';
import { initializeDashboard } from '../shared/auth-helper.js';
import { initializeNotifications } from '../shared/notifications-manager.js';


// Run checks as soon as the dashboard loads
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize Auth and Profile (Custom Helper)
    await initializeDashboard('Farmer');
    await initializeNotifications();


    // 2. Offline Sync checks
    updateNetworkIndicator();
    checkOfflineQueue();
});

// Listeners for actual browser network changes
window.addEventListener('online', () => {
    updateNetworkIndicator();
    syncOfflineData(); 
});

window.addEventListener('offline', () => {
    updateNetworkIndicator();
});

async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
    };
}

// Visually update the top right Online/Offline indicator (if present in HTML)
function updateNetworkIndicator() {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;

    if (navigator.onLine) {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        indicator.innerHTML = '<span class="pulse-dot"></span> Online';
    } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        indicator.innerHTML = '<span class="pulse-dot"></span> Offline';
    }
}

// Check localStorage to see if the farmer saved listings while offline
function checkOfflineQueue() {
    const banner = document.getElementById('offline-sync-banner');
    const bannerText = document.getElementById('sync-banner-text');
    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    
    if (queue.length > 0) {
        if (banner) banner.style.display = 'flex'; 
        if (bannerText) bannerText.innerText = `You have ${queue.length} listing(s) waiting to upload.`;
    } else {
        if (banner) banner.style.display = 'none'; 
    }
}

// Sync the offline data to the server (UPDATED FOR SUPABASE AUTH)
async function syncOfflineData() {
    if (!navigator.onLine) return;

    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    if (queue.length > 0) {
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/produce/sync', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ items: queue }) // Batch sync
            });

            if (response.ok) {
                localStorage.removeItem('kisanSetuOfflineQueue');
                checkOfflineQueue(); 
                alert("Success! All your offline listings have been synced.");
            }
        } catch (error) {
            console.error("Sync error:", error);
        }
    }
}
window.syncOfflineData = syncOfflineData;

// Handle the Voice Assistant Button
function activateVoice() {
    const btn = document.getElementById('voice-btn');
    if (!btn) return;

    btn.classList.add('listening');
    
    setTimeout(() => {
        btn.classList.remove('listening');
        const command = prompt("Voice Simulation:\nTry: 'Sell 50 quintals of wheat'");
        if(command) {
            window.location.href = 'sell_produce.html';
        }
    }, 500);
}
window.activateVoice = activateVoice;
