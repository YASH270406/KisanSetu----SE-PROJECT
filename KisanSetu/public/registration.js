// Variable to store the uploaded image data temporarily
let uploadedImageBase64 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"; 
let formDataToSubmit = {}; // Object to securely hold the data for the backend

// Function to handle the file upload and convert it for preview
function handleImageUpload(event) {
    const file = event.target.files[0]; 
    
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadedImageBase64 = e.target.result; 
            
            // Show the small thumbnail in the form
            const thumbnail = document.getElementById('form-thumbnail');
            thumbnail.src = uploadedImageBase64;
            thumbnail.style.display = 'block';
            
            // Change the button text
            document.getElementById('file-name-text').innerText = "Photo Selected!";
        }
        
        reader.readAsDataURL(file); 
    }
}

// Function to capture form data and show the Preview screen
function generatePreview() {
    const fullName = document.getElementById('fullName').value.trim();
    const mobileNum = document.getElementById('mobileNum').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const userRole = document.getElementById('userRole').value;
    const password = document.getElementById('password').value;

    // Basic Validation
    if (!fullName || !mobileNum || !pincode || !userRole || !password) {
        alert("Please fill in all the required fields before proceeding.");
        return;
    }

    if (mobileNum.length < 10) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    // Save data to our global object for final submission
    formDataToSubmit = {
        profileImage: uploadedImageBase64,
        fullName: fullName,
        mobileNum: mobileNum,
        pincode: pincode,
        userRole: userRole,
        password: password
    };

    // Populate the Preview Section
    document.getElementById('prev-name').innerText = fullName;
    document.getElementById('prev-mobile').innerText = "+91 " + mobileNum;
    document.getElementById('prev-pincode').innerText = pincode;
    document.getElementById('prev-role').innerText = userRole;
    document.getElementById('prev-avatar').src = uploadedImageBase64;

    // Switch Views
    document.getElementById('form-view').classList.remove('active');
    document.getElementById('preview-view').classList.add('active');
}

// Function to go back and edit the form
function editForm() {
    document.getElementById('preview-view').classList.remove('active');
    document.getElementById('form-view').classList.add('active');
}

// Function to handle the Final Submission to Backend
async function finalSubmit() {
    const submitBtn = document.querySelector('.btn-accent');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formDataToSubmit)
        });

        const data = await response.json();

        if (data.success) {
            alert(`Success! Profile created for ${formDataToSubmit.userRole}.\nRedirecting to login page...`);
            window.location.href = 'index.html';
        } else {
            alert(`Registration Failed: ${data.message}`);
            submitBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Confirm & Submit';
            submitBtn.disabled = false;
        }

    } catch (error) {
        console.error("Server Error:", error);
        alert("Could not connect to the server. Please ensure the backend is running!");
        submitBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Confirm & Submit';
        submitBtn.disabled = false;
    }
}