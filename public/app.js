// --- UI NAVIGATION & LOGIC ---

// Global variable to hold the user's number during the OTP phase
let loginMobileNumber = "";

function goToScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Simulate the Splash Screen timeout
window.onload = () => {
    setTimeout(() => {
        goToScreen('language-screen');
    }, 2500);
};

// Auto-tabbing for OTP inputs
const otpBoxes = document.querySelectorAll('.otp-box');
otpBoxes.forEach((box, index) => {
    box.addEventListener('keyup', (e) => {
        if (e.target.value.length === 1 && index < otpBoxes.length - 1) {
            otpBoxes[index + 1].focus(); // Move to next box
        } else if (e.key === 'Backspace' && index > 0) {
            otpBoxes[index - 1].focus(); // Move to previous box
        }
    });
});

function selectRole(roleName) {
    if (roleName === 'Farmer') {
        window.location.href = 'farmer_dashboard.html';
    } else if (roleName === 'Buyer') {
        window.location.href = 'buyer_dashboard.html';
    } else if (roleName === 'Equipment Owner') {
        window.location.href = 'equipment_dashboard.html';
    } else {
        alert('Unrecognized role. Cannot redirect.');
    }
}

// --- BACKEND API INTEGRATIONS ---

// 1. Triggered from Login Screen (Sends mobile number to check if account exists)
async function initiateLogin() {
    const mobileInput = document.getElementById('mobile-input').value.trim();
    
    if (mobileInput.length < 10) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    loginMobileNumber = mobileInput; // Store it globally for the OTP step

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobileNum: loginMobileNumber })
        });

        const data = await response.json();

        if (data.success) {
            // Account exists! Move to OTP screen.
            goToScreen('otp-screen'); 
        } else {
            // Account doesn't exist
            alert(data.message); 
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Server error. Ensure your Node.js backend is running!");
    }
}

// 2. Triggered from OTP Screen (Verifies the 4 digits)
async function verifyLoginOTP() {
    let enteredOTP = "";
    otpBoxes.forEach(box => enteredOTP += box.value);

    if (enteredOTP.length < 4) {
        alert("Please enter the full 4-digit OTP.");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobileNum: loginMobileNumber, otp: enteredOTP })
        });

        const data = await response.json();

        if (data.success) {
            // Bypass manual selection and use the role from the database!
            selectRole(data.role); 
        } else {
            alert(data.message); 
        }
    } catch (error) {
        console.error("OTP Error:", error);
        alert("Server error. Ensure your Node.js backend is running!");
    }
}