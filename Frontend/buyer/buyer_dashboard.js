import { initializeDashboard } from '../shared/auth-helper.js';
import { initializeNotifications } from '../shared/notifications-manager.js';


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth and Profile
    await initializeDashboard('Buyer');
    await initializeNotifications();


    console.log("Buyer Dashboard Loaded with Cloud Sync.");
});

function toggleSyncStatus() {
    alert("KisanSetu is currently synced with the Supabase Cloud.");
}
window.toggleSyncStatus = toggleSyncStatus;

function activateSearch() {
    const query = prompt("Search Marketplace:\nTry: 'Onion in Nasik' or 'Organic Rice'");
    if (query) {
        window.location.href = `browse_produce.html?q=${encodeURIComponent(query)}`;
    }
}
window.activateSearch = activateSearch;
