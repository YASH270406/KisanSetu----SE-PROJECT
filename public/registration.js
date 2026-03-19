// Variable to store the uploaded image data temporarily
let uploadedImageBase64 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"; // Default placeholder

// Function to handle the file upload and convert it for preview
function handleImageUpload(event) {
    const file = event.target.files[0]; // Get the file selected by the user
    
    if (file) {
        // Use FileReader to convert the image to a readable data URL
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedImageBase64 = e.target.result; // Save the image string
            
            // 1. Show the small thumbnail in the form
            const thumbnail = document.getElementById('form-thumbnail');
            thumbnail.src = uploadedImageBase64;
            thumbnail.style.display = 'block';
            
            // 2. Change the button text to show success
            document.getElementById('file-name-text').innerText = "Photo Selected!";
        }
        
        reader.readAsDataURL(file); // Trigger the reading process
    }
}

// Function to capture form data and show the Preview screen
function generatePreview() {
    // 1. Grab all the input values
    const fullName = document.getElementById('fullName').value.trim();
    const mobileNum = document.getElementById('mobileNum').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const userRole = document.getElementById('userRole').value;
    const password = document.getElementById('password').value;

    // 2. Basic Validation (Ensure no fields are empty)
    if (!fullName || !mobileNum || !pincode || !userRole || !password) {
        alert("Please fill in all the required fields before proceeding.");
        return;
    }

    if (mobileNum.length < 10) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    // 3. Populate the Preview Section with the captured data
    document.getElementById('prev-name').innerText = fullName;
    document.getElementById('prev-mobile').innerText = "+91 " + mobileNum;
    document.getElementById('prev-pincode').innerText = pincode;
    document.getElementById('prev-role').innerText = userRole;
    
    // NEW: Set the large preview avatar to the uploaded image
    document.getElementById('prev-avatar').src = uploadedImageBase64;

    // 4. Switch Views (Hide Form, Show Preview)
    document.getElementById('form-view').classList.remove('active');
    document.getElementById('preview-view').classList.add('active');
}

// Function to go back and edit the form
function editForm() {
    // Switch Views (Hide Preview, Show Form)
    document.getElementById('preview-view').classList.remove('active');
    document.getElementById('form-view').classList.add('active');
}

// Function to handle the Final Submission
function finalSubmit() {
    // In a real application, you would send the data (and the image file) to your backend database here.
    
    const role = document.getElementById('prev-role').innerText;
    
    // Simulate processing time
    alert(`Success! Profile created for ${role}.\nRedirecting to login page...`);
    
    // Redirect to the index.html (Phase 1 Auth) page
    window.location.href = 'index.html';
}