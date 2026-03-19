const express = require('express');
const router = express.Router();

// Import the Controller logic
const { registerUser, verifyOTP } = require('../controllers/authController');

// Define the endpoints
router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);

module.exports = router;