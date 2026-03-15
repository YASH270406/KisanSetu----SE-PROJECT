// Simulate the Offline/Online Connectivity Monitor
function toggleSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    
    if (indicator.classList.contains('online')) {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        indicator.innerHTML = '<span class="pulse-dot"></span> Offline';
        
        alert("Network lost. Operating in offline mode. New bids will be queued and sent when connection is restored.");
    } else {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        indicator.innerHTML = '<span class="pulse-dot"></span> Online';
        
        alert("Network restored. Syncing market prices and bids to the cloud...");
    }
}

// Handle the Search/Filter FAB
function activateSearch() {
    const btn = document.getElementById('search-btn');
    
    // Add a visual cue
    btn.style.backgroundColor = "#e65100"; // Darker yellow/orange
    
    setTimeout(() => {
        btn.style.backgroundColor = "var(--harvest-yellow)"; // Revert
        
        const search = prompt("Search for specific produce or mandate (e.g., 'Organic Wheat' or 'Onions in Haryana'):");
        
        if(search) {
            alert(`Searching marketplace for: "${search}"\nRedirecting to results...`);
        }
    }, 200);
}