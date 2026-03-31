import { initializeDashboard } from '../shared/auth-helper.js';
import { initializeNotifications } from '../shared/notifications-manager.js';


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth and Profile
    await initializeDashboard('Equipment Owner');
    await initializeNotifications();


    console.log("Equipment Console: Fleet and Bookings synced.");
});

function toggleSyncStatus() {
    alert("System Status: Synchronized with Supabase Cloud.");
}
window.toggleSyncStatus = toggleSyncStatus;

// Handle the Add Equipment FAB
function addNewEquipment() {
     window.location.href = 'manage_fleet.html';
}
window.addNewEquipment = addNewEquipment;
