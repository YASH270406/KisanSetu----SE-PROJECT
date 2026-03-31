// Frontend/farmer/sell_produce.js
import { supabase, uploadFile } from '../supabase-config.js';
import { sendSystemNotification, initializeNotifications } from '../shared/notifications-manager.js';


let selectedFiles = []; // Store selected files

document.addEventListener('DOMContentLoaded', async function() {
    await initializeNotifications();
    
    // 1. Image file preview on upload
    const fileInput = document.getElementById('cropImage');
    const uploadBox = document.querySelector('.file-upload-box');

    if (fileInput && uploadBox) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                selectedFiles = files.slice(0, 3); // Limit to 3 files
                
                const file = files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    uploadBox.innerHTML = `
                        <div style="position:relative;">
                            <img src="${event.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 12px; border: 2px solid #2e7d32;">
                            <div style="font-size: 0.8rem; color: #2e7d32; font-weight: 600; margin-top: 5px;">${selectedFiles.length} Photo(s) ready</div>
                        </div>
                    `;
                    uploadBox.style.padding = "15px"; 
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 2. Form submission intercept
    const form = document.getElementById('produce-form');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            const harvestDateInput = document.getElementById('harvestDate').value;
            const harvestDate = new Date(harvestDateInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0); 

            if (harvestDate < today) {
                alert("Harvest date cannot be in the past!");
                return;
            }

            const rawQuantity = parseFloat(document.getElementById('quantity').value);
            const unit = document.getElementById('unit').value;
            
            // Unit conversion to KG (Internal standard)
            let quantityKg = rawQuantity;
            if (unit === 'Quintal') quantityKg = rawQuantity * 100;
            if (unit === 'Ton') quantityKg = rawQuantity * 1000;

            const produceData = {
                crop_name: document.getElementById('cropName').value,
                variety: document.getElementById('variety').value,
                quantity: quantityKg, // Standardized to KG numerically
                unit: unit, 
                price: parseFloat(document.getElementById('price').value),
                harvest_date: harvestDateInput,
                status: 'Available'
            };


            // Check connection status
            if (navigator.onLine) {
                await sendLiveToDatabase(produceData); 
            } else {
                saveToOfflineQueue(produceData); 
            }
        });
    }
});

function saveToOfflineQueue(data) {
    let queue = JSON.parse(localStorage.getItem('kisanSetuOfflineQueue')) || [];
    queue.push(data); // Note: Offline images are not handled in this version
    localStorage.setItem('kisanSetuOfflineQueue', JSON.stringify(queue));
    
    alert(`Listing saved offline. It will publish automatically when internet is restored.`);
    window.location.href = 'farmer_dashboard.html';
}

async function sendLiveToDatabase(produceData) {
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in first.");

        // 1. Upload Images to Supabase Storage if any
        let imageUrls = [];
        if (selectedFiles.length > 0) {
            submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Uploading Photos...';
            for (const file of selectedFiles) {
                // Generate a unique filename
                const fileName = `${user.id}/${Date.now()}-${file.name}`;
                const url = await uploadFile(file, 'produce-images', fileName);
                if (url) imageUrls.push(url);
            }
        }

        // 2. Direct Supabase Insertion (FR-3.1 Completion)
        const { error } = await supabase
            .from('produce')
            .insert({
                farmer_id: user.id,
                ...produceData,
                images: imageUrls
            });

        if (error) throw error;

        // 3. Trigger Real-time Notification (FR-7.1)
        await sendSystemNotification(
            user.id,
            'Listing Published!',
            `Your ${produceData.quantity_kg / 100} Quintal(s) of ${produceData.crop_name} are now live on the marketplace.`,
            'success'
        );
        
        alert(`Success! Your ${produceData.crop_name} listing has been published.`);
        window.location.href = 'farmer_dashboard.html';
        
    } catch (error) {
        console.error("Upload Error:", error);
        alert("Failed to publish listing: " + error.message);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}
