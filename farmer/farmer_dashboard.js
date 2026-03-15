// Simulate the Offline/Online Connectivity Monitor
function toggleSyncStatus() {
    const indicator = document.getElementById('sync-indicator');
    
    // Check if it currently has the 'online' class
    if (indicator.classList.contains('online')) {
        // Switch to Offline mode
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        indicator.innerHTML = '<span class="pulse-dot"></span> Offline';
        
        // Show a brief alert to the user
        alert("Network lost. Operating in offline mode. Your data will be saved locally.");
    } else {
        // Switch back to Online mode
        indicator.classList.remove('offline');
        indicator.classList.add('online');
        indicator.innerHTML = '<span class="pulse-dot"></span> Online';
        
        alert("Network restored. Syncing data to the cloud...");
    }
}

// Handle the Voice Assistant Button
function activateVoice() {
    const btn = document.getElementById('voice-btn');
    
    // Add a simple visual cue that it is "listening"
    btn.style.backgroundColor = "#d32f2f"; // Turns red while listening
    
    // In a real app, this would trigger the Bhashini or Google Speech-to-Text API
    // For now, we simulate a 2-second listening period
    setTimeout(() => {
        btn.style.backgroundColor = "var(--harvest-yellow)"; // Revert to yellow
        
        // Prompt the user for a simulation
        const command = prompt("Simulating Voice Command.\nTry typing: 'Sell 50 quintals of wheat at 2500 rupees'");
        
        if(command) {
            alert(`Voice command processed: "${command}"\nRedirecting to the Smart Listing wizard...`);
        }
    }, 500);
}