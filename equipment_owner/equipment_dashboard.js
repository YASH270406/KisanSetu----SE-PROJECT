// Simulate the Offline/Online Connectivity Monitor
function toggleSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    
    if (indicator.classList.contains('online')) {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        indicator.innerHTML = '<span class="pulse-dot"></span> Offline';
        
        alert("Network lost. Operating in offline mode. Booking approvals will be queued and sent when connection is restored.");
    } else {
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        indicator.innerHTML = '<span class="pulse-dot"></span> Online';
        
        alert("Network restored. Syncing calendar and approvals to the cloud...");
    }
}

// Handle the Add Equipment FAB
function addNewEquipment() {
    const btn = document.getElementById('add-equip-btn');
    
    // Visual cue
    btn.style.backgroundColor = "#e65100"; 
    
    setTimeout(() => {
        btn.style.backgroundColor = "var(--harvest-yellow)"; 
        
        const equipName = prompt("Quick Add Asset:\nEnter equipment name (e.g., 'Mahindra Tractor 50HP'):");
        
        if(equipName) {
            alert(`Draft created for: "${equipName}"\nRedirecting to specification and pricing form...`);
        }
    }, 200);
}