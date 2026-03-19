// 1. Image file preview on upload
const fileInput = document.getElementById('cropImage');
const uploadBox = document.querySelector('.file-upload-box');

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            // Replace the cloud icon and text with the image preview
            uploadBox.innerHTML = `<img src="${event.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: cover;">`;
            uploadBox.style.padding = "10px"; // Adjust padding for the image
        };
        reader.readAsDataURL(file);
    }
});

// 2. Form submission intercept
document.getElementById('produce-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent page reload

    // 3. Validate harvest date >= today
    const harvestDateInput = document.getElementById('harvestDate').value;
    const harvestDate = new Date(harvestDateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison

    if (harvestDate > today) {
        alert("Harvest date cannot be in the future!");
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
        sendToDatabase(produceData); // Online: send straight to backend
    } else {
        saveToOfflineQueue(produceData); // Offline: save to localStorage
    }
});

// 4. Add offline queue array to localStorage
function saveToOfflineQueue(data) {
    // Get existing queue or create empty array
    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    queue.push(data);
    
    // Save back to browser storage
    localStorage.setItem('kisanSetuOfflineQueue', JSON.stringify(queue));
    
    alert(`You are currently offline. Your listing for ${data.quantity} ${data.unit} of ${data.crop} has been saved and will publish automatically when your internet is restored.`);
    window.location.href = 'farmer_dashboard.html';
}

// 5. Sync on navigator.onLine restored
window.addEventListener('online', function() {
    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    
    if (queue.length > 0) {
        console.log("Internet restored! Syncing " + queue.length + " saved listings...");
        
        queue.forEach(item => {
            sendToDatabase(item, true); // true flag indicates it's a background sync
        });
        
        // Clear the queue after successful sync
        localStorage.removeItem('kisanSetuOfflineQueue');
        alert("Your saved offline listings have been successfully published!");
    }
});

// Placeholder for your actual backend API call
function sendToDatabase(data, isBackgroundSync = false) {
    console.log("Sending to backend database: ", data);
    
    // If this is a direct submission (not a background sync), show success and redirect
    if (!isBackgroundSync) {
        alert(`Success! Your listing for ${data.quantity} ${data.unit} of ${data.crop} at ₹${data.price}/${data.unit} has been published.`);
        window.location.href = 'farmer_dashboard.html';
    }
}
