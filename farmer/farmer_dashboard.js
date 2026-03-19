// Run checks as soon as the dashboard loads
document.addEventListener("DOMContentLoaded", () => {
    updateNetworkIndicator();
    checkOfflineQueue();
});

// Listeners for actual browser network changes
window.addEventListener('online', () => {
    updateNetworkIndicator();
    syncOfflineData(); // Auto-sync when internet comes back
});

window.addEventListener('offline', () => {
    updateNetworkIndicator();
});

// Visually update the top right Online/Offline indicator
function updateNetworkIndicator() {
    const indicator = document.getElementById('sync-indicator');
    
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
        banner.style.display = 'flex'; // Show banner
        bannerText.innerText = `You have ${queue.length} listing(s) waiting to upload.`;
    } else {
        banner.style.display = 'none'; // Hide banner
    }
}

// Sync the offline data to the server (UPDATED FOR BACKEND API)
async function syncOfflineData() {
    if (!navigator.onLine) {
        alert("You are still offline. Please wait for an internet connection to sync.");
        return;
    }

    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    
    if (queue.length > 0) {
        console.log(`Syncing ${queue.length} items to database...`);
        
        try {
            // Loop through the queue and send to your backend API
            for (const item of queue) {
                const response = await fetch('/api/produce/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(item)
                });

                if (!response.ok) throw new Error("Failed to upload");
                console.log("Successfully uploaded:", item.crop);
            }
            
            // Clear queue and update UI ONLY if all uploads succeed
            localStorage.removeItem('kisanSetuOfflineQueue');
            checkOfflineQueue(); 
            alert("Success! All your offline listings have been synced to the market.");
            
        } catch (error) {
            console.error("Sync error:", error);
            alert("There was an issue syncing some items. We will try again later.");
        }
    }
}

// Handle the Voice Assistant Button
function activateVoice() {
    const btn = document.getElementById('voice-btn');
    
    // Add the "listening" CSS class
    btn.classList.add('listening');
    
    // Simulate a 2-second listening period
    setTimeout(() => {
        // Remove the class to revert to default styling
        btn.classList.remove('listening');
        
        // Prompt the user for a simulation
        const command = prompt("Simulating Voice Command.\nTry typing: 'Sell 50 quintals of wheat at 2500 rupees'");
        
        if(command) {
            alert(`Voice command processed: "${command}"\nRedirecting to the Smart Listing wizard...`);
        }
    }, 500);
}
