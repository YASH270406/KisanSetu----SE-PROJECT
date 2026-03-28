// Variable to store the uploaded image data temporarily
/*let uploadedImageBase64 = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"; // Default placeholder

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

// Function to handle moving to the OTP screen
function finalSubmit() {
    // Switch Views (Hide Preview, Show OTP)
    document.getElementById('preview-view').classList.remove('active');
    
    // In some CSS active might be managed differently, but typically adding 'active' works
    // For inline fallback if 'active' class isn't defined explicitly for display block:
    const otpView = document.getElementById('otp-view');
    otpView.classList.add('active');
    document.getElementById('preview-view').style.display = 'none';
    otpView.style.display = 'block';
    
    const mobile = document.getElementById('mobileNum').value.trim();
    
    // Simulate sending OTP to system
    alert(`System: Verification OTP has been successfully sent to +91 ${mobile}`);
}

// Function to handle auto-focus for OTP boxes
function moveToNext(current, nextFieldID) {
    if (current.value.length >= current.maxLength) {
        let next = current.nextElementSibling;
        if (next && next.tagName === 'INPUT') {
            next.focus();
        }
    }
}

// Function to handle the actual verified submission
function verifyRegistrationOTP() {
    // Retrieve details to store in our simulated database
    const fullName = document.getElementById('prev-name').innerText;
    let mobile = document.getElementById('prev-mobile').innerText.replace('+91', '').trim();
    // Sometimes there's a space, ensure clean 10 digit string
    mobile = mobile.replace(/\s+/g, '');
    const role = document.getElementById('prev-role').innerText;
    
    // Save to localStorage 'database'
    let users = JSON.parse(localStorage.getItem('kisan_registered_users')) || {};
    users[mobile] = { name: fullName, role: role };
    localStorage.setItem('kisan_registered_users', JSON.stringify(users));
    
    // Simulate processing time
    alert(`OTP Verified Successfully!\nAccount created for ${fullName} as ${role}.\nRedirecting to login...`);
    
    // Redirect to the index.html (Phase 1 Auth) page
    window.location.href = 'index.html';
}*/


// ─── KisanSetu | Registration — Real OTP via Fast2SMS ────────────────────────

// Shared key — same as app.js
const FAST2SMS_KEY = 'YOUR_FAST2SMS_API_KEY'; // ← same key as app.js

let uploadedImageBase64 = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop';

// ── Profile image upload ──────────────────────────────────────────────────────
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedImageBase64 = e.target.result;

        const thumbnail = document.getElementById('form-thumbnail');
        thumbnail.src = uploadedImageBase64;
        thumbnail.style.display = 'block';

        document.getElementById('file-name-text').innerText = 'Photo Selected!';
    };
    reader.readAsDataURL(file);
}

// ── Form → Preview ────────────────────────────────────────────────────────────
function generatePreview() {
    const fullName = document.getElementById('fullName').value.trim();
    const mobileNum = document.getElementById('mobileNum').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const userRole = document.getElementById('userRole').value;
    const password = document.getElementById('password').value;

    if (!fullName || !mobileNum || !pincode || !userRole || !password) {
        showRegToast('Please fill in all required fields.', 'error');
        return;
    }

    if (mobileNum.length !== 10 || !/^\d{10}$/.test(mobileNum)) {
        showRegToast('Please enter a valid 10-digit mobile number.', 'error');
        return;
    }

    if (password.length < 6) {
        showRegToast('Password must be at least 6 characters.', 'error');
        return;
    }

    // Check if number already registered
    const users = JSON.parse(localStorage.getItem('kisan_registered_users')) || {};
    if (users[mobileNum]) {
        showRegToast('This number is already registered. Please login.', 'error');
        setTimeout(() => window.location.href = 'index.html', 1800);
        return;
    }

    // Populate preview
    document.getElementById('prev-name').innerText = fullName;
    document.getElementById('prev-mobile').innerText = '+91 ' + mobileNum;
    document.getElementById('prev-pincode').innerText = pincode;
    document.getElementById('prev-role').innerText = userRole;
    document.getElementById('prev-avatar').src = uploadedImageBase64;

    document.getElementById('form-view').classList.remove('active');
    document.getElementById('preview-view').classList.add('active');
}

// ── Preview → Edit ────────────────────────────────────────────────────────────
function editForm() {
    document.getElementById('preview-view').classList.remove('active');
    document.getElementById('form-view').classList.add('active');
}

// ── Generate OTP ──────────────────────────────────────────────────────────────
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// ── Store OTP in sessionStorage with 5-min expiry ────────────────────────────
function storeRegOTP(mobile, otp) {
    const payload = {
        otp,
        mobile,
        expiresAt: Date.now() + (5 * 60 * 1000)
    };
    sessionStorage.setItem('kisansetu_reg_otp', JSON.stringify(payload));
}

// ── Send OTP via Fast2SMS ─────────────────────────────────────────────────────
async function sendOTPviaSMS(mobile, otp) {
    try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: {
                'authorization': FAST2SMS_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                route: 'otp',
                variables_values: otp,
                numbers: mobile,
                flash: '0'
            })
        });

        const result = await response.json();
        return result.return === true
            ? { success: true }
            : { success: false, reason: result.message || 'SMS failed' };

    } catch (err) {
        console.error('Fast2SMS error:', err);
        return { success: false, reason: 'Network error' };
    }
}

// ── Preview → Send OTP → Show OTP screen ─────────────────────────────────────
async function finalSubmit() {
    const mobile = document.getElementById('mobileNum').value.trim();
    const otp = generateOTP();

    storeRegOTP(mobile, otp);

    // Button loading state
    const btn = document.querySelector('#preview-view .btn-accent');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...';
    btn.disabled = true;

    const result = await sendOTPviaSMS(mobile, otp);

    btn.innerHTML = originalText;
    btn.disabled = false;

    if (result.success) {
        showRegToast(`OTP sent to +91 ${mobile}`, 'success');
    } else {
        // SMS unavailable — show OTP for demo
        showRegToast(`SMS unavailable. Demo OTP: ${otp}`, 'warning');
    }

    // Show OTP screen
    document.getElementById('preview-view').classList.remove('active');
    document.getElementById('preview-view').style.display = 'none';

    const otpView = document.getElementById('otp-view');
    otpView.style.display = 'block';
    otpView.classList.add('active');

    // Update subtitle with mobile number
    const subtitle = otpView.querySelector('.helper-text');
    if (subtitle) {
        subtitle.textContent = `OTP sent to +91 ${mobile}. Valid for 5 minutes.`;
    }
}

// ── Verify OTP and create account ─────────────────────────────────────────────
function verifyRegistrationOTP() {
    // Read the 4 OTP input boxes
    const boxes = document.querySelectorAll('#otp-view input[maxlength="1"]');
    const enteredOTP = Array.from(boxes).map(b => b.value).join('').trim();

    if (enteredOTP.length < 4) {
        showRegToast('Please enter the complete 4-digit OTP.', 'error');
        return;
    }

    // Verify against stored OTP
    const raw = sessionStorage.getItem('kisansetu_reg_otp');
    if (!raw) {
        showRegToast('OTP not found. Please go back and request again.', 'error');
        return;
    }

    const payload = JSON.parse(raw);

    if (Date.now() > payload.expiresAt) {
        sessionStorage.removeItem('kisansetu_reg_otp');
        showRegToast('OTP has expired. Please go back and request a new one.', 'error');
        return;
    }

    if (enteredOTP !== payload.otp) {
        showRegToast('Incorrect OTP. Please try again.', 'error');
        return;
    }

    // OTP verified — save user to localStorage
    sessionStorage.removeItem('kisansetu_reg_otp');

    const fullName = document.getElementById('prev-name').innerText;
    const mobile = payload.mobile;
    const role = document.getElementById('prev-role').innerText;
    const pincode = document.getElementById('prev-pincode').innerText;

    const users = JSON.parse(localStorage.getItem('kisan_registered_users')) || {};
    users[mobile] = { name: fullName, role, pincode };
    localStorage.setItem('kisan_registered_users', JSON.stringify(users));

    showRegToast(`Account created! Welcome, ${fullName}.`, 'success');

    setTimeout(() => window.location.href = 'index.html', 1500);
}

// ── OTP box auto-tab ──────────────────────────────────────────────────────────
function moveToNext(current) {
    if (current.value.length >= current.maxLength) {
        const next = current.nextElementSibling;
        if (next && next.tagName === 'INPUT') next.focus();
    }
}

// ── Toast utility (local to registration page) ────────────────────────────────
function showRegToast(message, type) {
    const existing = document.getElementById('reg-toast');
    if (existing) existing.remove();

    const colors = {
        success: '#2e7d32',
        error: '#d32f2f',
        warning: '#e65100',
        info: '#1565c0'
    };

    const toast = document.createElement('div');
    toast.id = 'reg-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 28px; left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: #fff; padding: 13px 22px;
        border-radius: 25px; font-size: 0.85rem;
        font-family: 'Poppins', sans-serif; font-weight: 500;
        z-index: 9999; max-width: 88%; text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}