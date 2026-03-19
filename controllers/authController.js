// Dummy Database for now (Until we connect real SQL)
const usersDB = [];

// Logic for User Registration
const registerUser = (req, res) => {
    const { fullName, mobileNum, pincode, userRole, password } = req.body;

    // 1. Validation
    if (!fullName || !mobileNum || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // 2. Check if user exists
    const userExists = usersDB.find(u => u.mobileNum === mobileNum);
    if (userExists) {
        return res.status(400).json({ success: false, message: 'Mobile number already registered.' });
    }

    // 3. Save to database (Simulated)
    const newUser = { id: Date.now(), fullName, mobileNum, pincode, userRole };
    usersDB.push(newUser);

    console.log("New User Created:", newUser);

    // 4. Send response back to frontend
    res.status(201).json({ 
        success: true, 
        message: 'Account successfully created!', 
        user: newUser 
    });
};

// Logic for OTP Verification
const verifyOTP = (req, res) => {
    const { mobileNum, otp } = req.body;
    
    if (otp === '1234') {
        res.status(200).json({ success: true, message: 'Login successful!' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
};

// Export the functions so the Route file can use them
module.exports = {
    registerUser,
    verifyOTP
};