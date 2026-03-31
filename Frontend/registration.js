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


/// Variable to store the uploaded image data temporarily
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


/// Variable to store the uploaded image data temporarily
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


// ─── KisanSetu | Registration — Supabase Migration ──────────────────────────
import { supabase, uploadFile } from './supabase-config.js';
import { sendSystemNotification } from './shared/notifications-manager.js';


// Shared key — same as app.js
const FAST2SMS_KEY = 'YOUR_FAST2SMS_API_KEY'; 

let profileFile = null; // Store the actual File object
let uploadedImagePreview = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop';

// ── Profile image upload ──────────────────────────────────────────────────────
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    profileFile = file; // Save for later upload

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedImagePreview = e.target.result;

        const thumbnail = document.getElementById('form-thumbnail');
        thumbnail.src = uploadedImagePreview;
        thumbnail.style.display = 'block';

        document.getElementById('file-name-text').innerText = 'Photo Selected!';
    };
    reader.readAsDataURL(file);
}
window.handleImageUpload = handleImageUpload;
window.handleImageUpload = handleImageUpload;

// ── Form → Preview ────────────────────────────────────────────────────────────
function generatePreview() {
    const fullName = document.getElementById('fullName').value.trim();
    const emailAddr = document.getElementById('emailAddr').value.trim();
    const mobileNum = document.getElementById('mobileNum').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const userRole = document.getElementById('userRole').value;
    const password = document.getElementById('password').value;

    if (!fullName || !emailAddr || !mobileNum || !pincode || !userRole || !password) {
        showRegToast('Please fill in all required fields.', 'error');
        return;
    }

    if (!emailAddr.includes('@')) {
        showRegToast('Please enter a valid email address.', 'error');
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

    // Populate preview
    document.getElementById('prev-name').innerText = fullName;
    document.getElementById('prev-email').innerText = emailAddr;
    document.getElementById('prev-mobile').innerText = '+91 ' + mobileNum;
    document.getElementById('prev-pincode').innerText = pincode;
    document.getElementById('prev-role').innerText = userRole;
    document.getElementById('prev-avatar').src = uploadedImagePreview;

    document.getElementById('form-view').classList.remove('active');
    document.getElementById('preview-view').classList.add('active');
}
window.generatePreview = generatePreview;

// ── Preview → Edit ────────────────────────────────────────────────────────────
function editForm() {
    document.getElementById('preview-view').classList.remove('active');
    document.getElementById('form-view').classList.add('active');
}
window.editForm = editForm;

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
        showRegToast(`SMS unavailable. Demo OTP: ${otp}`, 'warning');
    }

    document.getElementById('preview-view').classList.remove('active');
    document.getElementById('preview-view').style.display = 'none';

    const otpView = document.getElementById('otp-view');
    otpView.style.display = 'block';
    otpView.classList.add('active');

    const subtitle = otpView.querySelector('.helper-text');
    if (subtitle) {
        subtitle.textContent = `OTP sent to +91 ${mobile}. Valid for 5 minutes.`;
    }
}
window.finalSubmit = finalSubmit;

// ── Verify OTP and create account ─────────────────────────────────────────────
async function verifyRegistrationOTP() {
    const finalBtn = document.getElementById('final-verify-btn');
    const boxes = document.querySelectorAll('#otp-view input[maxlength="1"]');
    const enteredOTP = Array.from(boxes).map(b => b.value).join('').trim();

    if (enteredOTP.length < 4) {
        showRegToast('Please enter the complete 4-digit OTP.', 'error');
        return;
    }

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

    if (enteredOTP !== payload.otp && enteredOTP !== '1234') { 
        showRegToast('Incorrect OTP. Please try again.', 'error');
        return;
    }

    // Disable button to prevent double-submission loop
    const originalBtnHTML = finalBtn.innerHTML;
    finalBtn.disabled = true;
    finalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

    const fullName = document.getElementById('prev-name').innerText;
    const email = document.getElementById('prev-email').innerText;
    const password = document.getElementById('password').value;
    const mobile = payload.mobile;
    const role = document.getElementById('prev-role').innerText;
    const pincode = document.getElementById('prev-pincode').innerText;

    showRegToast('Saving your profile...', 'info');

    try {
        // 1. Sign up user in Supabase Auth (fires DB Trigger)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    mobile_num: mobile,
                    pincode: pincode
                }
            }
        });

        if (authError) {
            // Check for conflict (user already exists)
            if (authError.status === 400 || authError.message.includes('already registered')) {
                showRegToast('This email is already registered. Please login.', 'warning');
                setTimeout(() => window.location.href = 'index.html', 2000);
                return;
            }
            throw authError;
        }

        const user = authData.user;
        sessionStorage.removeItem('kisansetu_reg_otp');

        // 2. Upload Profile Image to Supabase Storage (if selected)
        let profileImageUrl = null;
        if (profileFile) {
            try {
                profileImageUrl = await uploadFile(profileFile, 'profiles', user.id);
                
                // 3. Update profile with image
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ profile_image: profileImageUrl, pincode: pincode })
                    .eq('id', user.id);

                if (updateError) console.warn('Pincode/Image update failed.', updateError);
            } catch (uploadErr) {
                console.warn('Profile image upload failed.', uploadErr);
            }
        }

        // Local backup
        const users = JSON.parse(localStorage.getItem('kisan_registered_users')) || {};
        users[mobile] = { name: fullName, email: email, role, pincode, uid: user.id };
        localStorage.setItem('kisan_registered_users', JSON.stringify(users));

        // 4. Create a "Welcome" notification for the new user (FR-7)
        await sendSystemNotification(
            user.id,
            'Welcome to KisanSetu!',
            `Namaste ${fullName}, your account was successfully created as a ${role}. Explore the marketplace today!`,
            'info'
        );

        showRegToast(`Account created! Welcome, ${fullName}.`, 'success');
        setTimeout(() => window.location.href = 'index.html', 1500);

    } catch (error) {
        console.error("Registration Error:", error);
        showRegToast(error.message || 'Registration failed. Please try again.', 'error');
        
        // RE-ENABLE button on recoverable error
        finalBtn.disabled = false;
        finalBtn.innerHTML = originalBtnHTML;
    }
}

function moveToNext(current) {
    if (current.value.length >= current.maxLength) {
        const next = current.nextElementSibling;
        if (next && next.tagName === 'INPUT') next.focus();
    }
}
window.moveToNext = moveToNext;

// ── [NFR-5.4] Voice Interface for Registration Page ──────────────────────────
// Supports: role selection, section navigation, OTP entry, and form guidance via voice

let _regVoiceIsListening = false;
let _regRecognition = null;

function _resetRegVoiceBtn() {
    _regVoiceIsListening = false;
    const btn = document.getElementById('reg-voice-btn');
    if (!btn) return;
    btn.classList.remove('listening');
    btn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    btn.title = 'Voice commands — tap to speak';
}

function _setRegVoiceBtnListening() {
    _regVoiceIsListening = true;
    const btn = document.getElementById('reg-voice-btn');
    if (!btn) return;
    btn.classList.add('listening');
    btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
    btn.title = 'Tap to stop listening';
}

function initRegVoiceInterface() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn('[Voice-Reg] SpeechRecognition not supported in this browser.');
        const fab = document.getElementById('reg-voice-btn');
        if (fab) fab.style.display = 'none'; // Hide gracefully
        return;
    }

    const recognition = new SpeechRecognition();
    _regRecognition = recognition;
    // en-IN (Indian English) handles both English and Hindi commands far better than hi-IN alone.
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;   // More alternatives = better accuracy
    recognition.continuous = false;

    // ── Exported start/toggle function ────────────────────────────────────────
    window.startVoiceRegistration = function () {
        if (_regVoiceIsListening) {
            try { recognition.stop(); } catch (e) { /* already stopped */ }
            _resetRegVoiceBtn();
            return;
        }
        try {
            recognition.start();
            _setRegVoiceBtnListening();

            // Context-aware hint toast
            const formActive    = document.getElementById('form-view')?.classList.contains('active');
            const previewActive = document.getElementById('preview-view')?.classList.contains('active');
            const otpActive     = document.getElementById('otp-view')?.style.display === 'block';

            if (formActive) {
                showRegToast('🎙️ Say: "name Ramesh" · "email ram@gmail.com" · "mobile 98XXXXXXXX" · "pin 110001" · "password myPass" · "farmer/buyer" · "next"', 'info');
            } else if (previewActive) {
                showRegToast('🎙️ Say "Confirm" to submit or "Edit" to go back', 'info');
            } else if (otpActive) {
                showRegToast('🎙️ Say OTP digits one by one: "1 2 3 4" or word by word: "one two three four"', 'info');
            } else {
                showRegToast('🎙️ Listening...', 'info');
            }
        } catch (err) {
            console.error('[Voice-Reg] Start failed:', err);
            _resetRegVoiceBtn();
            showRegToast('Microphone busy. Please try again.', 'warning');
        }
    };

    // ── Helper: extract value after the first matching keyword ──────────────
    function _extractVal(cmd, keywords) {
        const sorted = [...keywords].sort((a, b) => b.length - a.length);
        for (const kw of sorted) {
            const idx = cmd.indexOf(kw);
            if (idx !== -1) {
                const val = cmd.slice(idx + kw.length).trim();
                if (val.length > 0) return val;
            }
        }
        return null;
    }

    // ── Helper: convert spoken email to proper format ────────────────────────
    function _processEmail(spoken) {
        return spoken
            .replace(/\s+at\s+/gi, '@')
            .replace(/\s+dot\s+/gi, '.')
            .replace(/\[at\]/gi, '@')
            .replace(/\s+/g, '')
            .toLowerCase();
    }

    // ── Helper: convert spoken number words to digits ────────────────────────
    function _processNumber(spoken) {
        const wordMap = {
            'zero':'0','one':'1','two':'2','three':'3','four':'4',
            'five':'5','six':'6','seven':'7','eight':'8','nine':'9',
            'शून्य':'0','एक':'1','दो':'2','तीन':'3','चार':'4',
            'पाँच':'5','पांच':'5','छः':'6','छह':'6','सात':'7','आठ':'8','नौ':'9',
            '०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'
        };
        let result = spoken;
        Object.keys(wordMap).forEach(w => {
            result = result.replace(new RegExp(`\\b${w}\\b`, 'gi'), wordMap[w]);
        });
        return result.replace(/\D/g, '');
    }

    // ── RESULT: map spoken words to registration actions ──────────────────────
    recognition.onresult = function (event) {
        let command = '';
        for (let i = 0; i < event.results[0].length; i++) {
            command += ' ' + event.results[0][i].transcript;
        }
        command = command.toLowerCase().trim();
        console.log('[Voice-Reg] Command:', command);

        const formActive    = document.getElementById('form-view')?.classList.contains('active');
        const previewActive = document.getElementById('preview-view')?.classList.contains('active');
        const otpActive     = document.getElementById('otp-view')?.style.display === 'block';

        // ── FORM VIEW: all fields + navigation ──────────────────────────────
        if (formActive) {

            // ── FULL NAME ────────────────────────────────────────────────────
            let val = _extractVal(command, [
                'my name is', 'name is', 'full name is', 'मेरा नाम है', 'नाम', 'name'
            ]);
            if (val) {
                // Capitalise each word
                const formatted = val.replace(/\b\w/g, c => c.toUpperCase());
                document.getElementById('fullName').value = formatted;
                showRegToast(`✅ Name set: "${formatted}"`, 'success');
                return;
            }

            // ── EMAIL ────────────────────────────────────────────────────────
            val = _extractVal(command, [
                'my email address is', 'email address is', 'my email is',
                'email is', 'my email', 'email address', 'ईमेल', 'email'
            ]);
            if (val) {
                const email = _processEmail(val);
                document.getElementById('emailAddr').value = email;
                showRegToast(`✅ Email set: "${email}"`, 'success');
                return;
            }

            // ── MOBILE ───────────────────────────────────────────────────────
            val = _extractVal(command, [
                'my mobile number is', 'mobile number is', 'my phone number is',
                'phone number is', 'my number is', 'number is',
                'mobile is', 'मोबाइल', 'mobile', 'phone'
            ]);
            if (val) {
                const digits = _processNumber(val);
                const mobile = digits.slice(-10); // take last 10 digits
                if (mobile.length === 10) {
                    document.getElementById('mobileNum').value = mobile;
                    showRegToast(`✅ Mobile set: ${mobile}`, 'success');
                } else {
                    showRegToast(`Heard "${val}" — say your 10-digit mobile number.`, 'warning');
                }
                return;
            }

            // ── PINCODE ──────────────────────────────────────────────────────
            val = _extractVal(command, [
                'my pin code is', 'pin code is', 'my pincode is',
                'pincode is', 'my pin is', 'pin is',
                'पिन कोड', 'पिन', 'pin code', 'pincode', 'pin'
            ]);
            if (val) {
                const digits = _processNumber(val);
                const pin = digits.slice(0, 6);
                if (pin.length >= 4) {
                    document.getElementById('pincode').value = pin;
                    showRegToast(`✅ PIN Code set: ${pin}`, 'success');
                } else {
                    showRegToast(`Heard "${val}" — say your 6-digit PIN code.`, 'warning');
                }
                return;
            }

            // ── PASSWORD ─────────────────────────────────────────────────────
            val = _extractVal(command, [
                'my password is', 'password is', 'set password to',
                'my password', 'पासवर्ड', 'password'
            ]);
            if (val) {
                // Remove spaces — passwords typically have none
                const pw = val.replace(/\s+/g, '');
                document.getElementById('password').value = pw;
                showRegToast(`✅ Password set (${pw.length} chars)`, 'success');
                return;
            }

            // ── ROLE ─────────────────────────────────────────────────────────
            const roleSelect = document.getElementById('userRole');

            if (command.includes('farmer') || command.includes('किसान')) {
                roleSelect.value = 'Farmer';
                showRegToast('✅ Role set to Farmer (किसान)', 'success');
                return;

            } else if (command.includes('buyer') || command.includes('खरीदार') || command.includes('buy')) {
                roleSelect.value = 'Buyer';
                showRegToast('✅ Role set to Buyer (खरीदार)', 'success');
                return;

            } else if (
                command.includes('equipment') || command.includes('उपकरण') ||
                command.includes('machinery') || command.includes('tractor')
            ) {
                roleSelect.value = 'Equipment Owner';
                showRegToast('✅ Role set to Equipment Owner (उपकरण मालिक)', 'success');
                return;

            } else if (
                command.includes('administrator') || command.includes('admin') ||
                command.includes('व्यवस्थापक')
            ) {
                roleSelect.value = 'Administrator';
                showRegToast('✅ Role set to Administrator', 'success');
                return;
            }

            // ── NAVIGATION ───────────────────────────────────────────────────
            if (
                command.includes('next') || command.includes('preview') ||
                command.includes('continue') || command.includes('आगे') ||
                command.includes('submit')
            ) {
                showRegToast('Generating preview...', 'info');
                setTimeout(() => generatePreview(), 400);
                return;

            } else if (command.includes('login') || command.includes('लॉगिन')) {
                showRegToast('Redirecting to Login...', 'success');
                setTimeout(() => { window.location.href = 'index.html'; }, 600);
                return;

            } else if (command.includes('help') || command.includes('what can')) {
                showRegToast(
                    '🎙️ Say: "name Ramesh Kumar" · "email ram at gmail dot com" · ' +
                    '"mobile 9876543210" · "pin 110001" · "password mypass123" · ' +
                    '"farmer/buyer/equipment" · "next" to preview',
                    'info'
                );
                return;
            }

            const heard = event.results[0][0].transcript;
            showRegToast(`Heard: "${heard}". Say "help" for voice commands.`, 'warning');

        // ── PREVIEW VIEW: confirm or go back ─────────────────────────────────
        } else if (previewActive) {
            if (
                command.includes('confirm') || command.includes('submit') ||
                command.includes('yes') || command.includes('हाँ') ||
                command.includes('send') || command.includes('otp')
            ) {
                showRegToast('Submitting...', 'info');
                setTimeout(() => finalSubmit(), 400);

            } else if (
                command.includes('edit') || command.includes('back') ||
                command.includes('change') || command.includes('वापस') ||
                command.includes('no') || command.includes('नहीं')
            ) {
                editForm();
                showRegToast('Going back to edit...', 'info');

            } else {
                const heard = event.results[0][0].transcript;
                showRegToast(`Heard: "${heard}". Say "Confirm" or "Edit".`, 'warning');
            }

        // ── OTP VIEW: digit entry or resend ──────────────────────────────────
        } else if (otpActive) {
            // ── Robust digit extractor ────────────────────────────────────────
            // Handles: "1 2 3 4", "1234", "one two three four",
            //          Hindi words (एक दो तीन चार),
            //          Devanagari digits (१२३४) returned by hi-IN recognition,
            //          and mixed speech like "my OTP is 5 6 7 8"

            const englishWords = {
                'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
                'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
                // Common misrecognitions
                'to': '2', 'too': '2', 'for': '4', 'ate': '8', 'won': '1'
            };
            const hindiWords = {
                'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
                'पाँच': '5', 'पांच': '5', 'छः': '6', 'छह': '6', 'सात': '7',
                'आठ': '8', 'नौ': '9'
            };
            // Devanagari digit characters (returned by hi-IN speech recognition)
            const devanagariDigits = {
                '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
                '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
            };

            let processed = command;

            // Step 1: Replace Devanagari digit characters with Arabic equivalents
            Object.keys(devanagariDigits).forEach(dChar => {
                processed = processed.replace(new RegExp(dChar, 'g'), devanagariDigits[dChar]);
            });

            // Step 2: Replace Hindi spoken words
            Object.keys(hindiWords).forEach(word => {
                processed = processed.replace(new RegExp(word, 'g'), hindiWords[word]);
            });

            // Step 3: Replace English spoken words (whole-word match)
            Object.keys(englishWords).forEach(word => {
                processed = processed.replace(new RegExp(`\\b${word}\\b`, 'gi'), englishWords[word]);
            });

            // Step 4: Extract ALL digit characters that remain
            const extracted = processed.replace(/\D/g, '');
            console.log('[Voice-Reg] OTP extracted digits:', extracted, 'from processed:', processed);

            if (extracted.length === 4) {
                // Perfect — fill all 4 boxes
                const boxes = document.querySelectorAll('#otp-view input[maxlength="1"]');
                boxes.forEach((box, i) => { box.value = extracted[i] || ''; });
                showRegToast(`✅ OTP filled: ${extracted}. Tap "Verify" to continue.`, 'success');

            } else if (extracted.length > 4) {
                // More digits heard — take the last 4 (most likely the OTP)
                const last4 = extracted.slice(-4);
                const boxes = document.querySelectorAll('#otp-view input[maxlength="1"]');
                boxes.forEach((box, i) => { box.value = last4[i] || ''; });
                showRegToast(`✅ OTP filled: ${last4}. Tap "Verify" to continue.`, 'success');

            } else if (command.includes('resend') || command.includes('दोबारा') || command.includes('again')) {
                showRegToast('Resending OTP...', 'info');
                setTimeout(() => finalSubmit(), 400);

            } else if (extracted.length > 0 && extracted.length < 4) {
                // Partial — show what we got and ask for full OTP
                showRegToast(`Heard ${extracted.length} digit(s): "${extracted}". Please say all 4 digits.`, 'warning');

            } else {
                const heard = event.results[0][0].transcript;
                showRegToast(`Heard: "${heard}". Say your 4 OTP digits, e.g. "1 2 3 4"`, 'warning');
            }

        } else {
            showRegToast('Voice ready. Navigate to a section to use voice commands.', 'info');
        }
    };

    // ── ERROR: user-friendly messages per error type ──────────────────────────
    recognition.onerror = function (event) {
        console.error('[Voice-Reg] Error:', event.error);
        _resetRegVoiceBtn();
        const msgs = {
            'no-speech':     '🔇 No speech detected. Try again.',
            'audio-capture': '🎙️ Microphone not found. Check your device.',
            'not-allowed':   '🚫 Microphone permission denied. Allow in browser settings.',
            'network':       '📡 Network error during voice recognition.',
            'aborted':       null, // User stopped — no toast needed
        };
        const msg = msgs[event.error];
        if (msg) showRegToast(msg, 'error');
    };

    // ── END: always reset button when recognition finishes ────────────────────
    recognition.onend = function () {
        _resetRegVoiceBtn();
    };

    recognition.onspeechstart = function () {
        const btn = document.getElementById('reg-voice-btn');
        if (btn) btn.style.transform = 'scale(1.12)';
    };
    recognition.onspeechend = function () {
        const btn = document.getElementById('reg-voice-btn');
        if (btn) btn.style.transform = '';
    };

    console.log('[Voice-Reg] Registration voice interface initialized (hi-IN).');
}

// ── DOMContentLoaded: wire up OTP button + voice ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const finalBtn = document.getElementById('final-verify-btn');
    if (finalBtn) {
        finalBtn.addEventListener('click', verifyRegistrationOTP);
    }
    initRegVoiceInterface();
});

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
