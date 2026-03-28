document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Image file preview on upload
    const fileInput = document.getElementById('cropImage');
    const uploadBox = document.querySelector('.file-upload-box');

    if (fileInput && uploadBox) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    uploadBox.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: cover;">`;
                    uploadBox.style.padding = "10px"; 
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 2. Form submission intercept
    const form = document.getElementById('produce-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); 

            const harvestDateInput = document.getElementById('harvestDate').value;
            const harvestDate = new Date(harvestDateInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0); 

            if (harvestDate < today) {
                alert("Harvest date cannot be in the past!");
                return;
            }

            // Gather form data
            const produceData = {
                id: Date.now(),
                crop: document.getElementById('cropName').value,
                variety: document.getElementById('variety').value,
                quantity: document.getElementById('quantity').value,
                unit: document.getElementById('unit').value,
                price: document.getElementById('price').value,
                harvestDate: harvestDateInput
            };

            // Check connection status
            if (navigator.onLine) {
                sendLiveToDatabase(produceData); // Online: Send single item to /add
            } else {
                saveToOfflineQueue(produceData); // Offline: Save to localStorage
            }
        });
    }
});

// 3. Add offline queue array to localStorage
function saveToOfflineQueue(data) {
    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    queue.push(data);
    localStorage.setItem('kisanSetuOfflineQueue', JSON.stringify(queue));
    
    alert(`You are offline. Your listing for ${data.quantity} ${data.unit} of ${data.crop} is saved and will publish automatically when internet is restored.`);
    window.location.href = 'farmer_dashboard.html';
}

// 4. Sync if navigator.onLine is restored
window.addEventListener('online', async function() {
    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    
    if (queue.length > 0) {
        console.log(`Internet restored! Syncing ${queue.length} saved listings...`);
        
        try {
            // Send the entire array at once to the sync endpoint
            const response = await fetch('http://localhost:3000/api/produce/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: queue }) 
            });

            if (response.ok) {
                localStorage.removeItem('kisanSetuOfflineQueue');
                alert("Your saved offline listings have been successfully published to the marketplace!");
            }
        } catch (error) {
            console.error("Background sync failed:", error);
        }
    }
});

// 5. Actual backend API call for LIVE single uploads
async function sendLiveToDatabase(data) {
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Publishing...";
    submitBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/produce/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error("Upload failed");
        
        alert(`Success! Your listing for ${data.quantity} ${data.unit} of ${data.crop} has been published.`);
        window.location.href = 'farmer_dashboard.html';
        
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to reach server. We will save this offline instead.");
        saveToOfflineQueue(data); 
    }
}