const connectDB = require('../config/db');
const bcrypt = require('bcrypt');

// 1. REGISTER A NEW USER
const registerUser = async (req, res) => {
    const { profileImage, fullName, mobileNum, pincode, userRole, password } = req.body;

    if (!fullName || !mobileNum || !password || !userRole) {
        return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    try {
        const db = await connectDB();

        // Check if the mobile number is already registered
        const existingUser = await db.get(`SELECT * FROM Users WHERE mobileNum = ?`, [mobileNum]);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Mobile number already registered.' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        await db.run(
            `INSERT INTO Users (profileImage, fullName, mobileNum, pincode, userRole, password) VALUES (?, ?, ?, ?, ?, ?)`,
            [profileImage, fullName, mobileNum, pincode, userRole, hashedPassword] 
        );

        console.log(`✅ New ${userRole} Registered: ${fullName}`);
        res.status(201).json({ success: true, message: 'Account successfully created!' });

    } catch (error) {
        console.error("Database Error during registration:", error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// 2. INITIATE LOGIN (Send OTP)
const loginUser = async (req, res) => {
    const { mobileNum } = req.body;

    try {
        const db = await connectDB();
        const user = await db.get(`SELECT * FROM Users WHERE mobileNum = ?`, [mobileNum]);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found. Please register first.' });
        }

        // Simulate sending an OTP via SMS
        console.log(`📲 Sending OTP 1234 to ${mobileNum}`);
        res.status(200).json({ success: true, message: 'OTP sent successfully.' });

    } catch (error) {
        console.error("Database Error during login initiation:", error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// 3. VERIFY OTP & COMPLETE LOGIN
const verifyOTP = async (req, res) => {
    const { mobileNum, otp } = req.body;
    
    // We accept '1234' as the dummy OTP for testing
    if (otp === '1234') {
        try {
            const db = await connectDB();
            const user = await db.get(`SELECT * FROM Users WHERE mobileNum = ?`, [mobileNum]);
            
            if (user) {
                console.log(`🔓 User Logged In: ${user.fullName} (${user.userRole})`);
                // Send back the role so the frontend knows which dashboard to load
                res.status(200).json({ success: true, role: user.userRole, message: 'Login successful!' });
            } else {
                res.status(404).json({ success: false, message: 'User not found.' });
            }
        } catch (error) {
            console.error("Database Error during OTP verify:", error);
            res.status(500).json({ success: false, message: 'Internal server error.' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
};

module.exports = { registerUser, loginUser, verifyOTP };