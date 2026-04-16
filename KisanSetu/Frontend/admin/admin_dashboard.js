import { initializeDashboard } from '../shared/auth-helper.js';
import { initializeNotifications } from '../shared/notifications-manager.js';


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth and Profile
    await initializeDashboard('Administrator');
    await initializeNotifications();


    console.log("Admin Console: Secure session active.");
});
