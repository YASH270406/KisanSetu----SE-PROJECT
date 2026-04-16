// routes/equipmentRoutes.js
const express = require('express');
const router = express.Router();
const { getAllEquipment, createBooking, getMyBookings } = require('../controllers/equipmentController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/list', getAllEquipment);             // Public: Browse machinery
router.post('/book', verifyToken, createBooking);  // Protected: Request booking
router.get('/my-bookings', verifyToken, getMyBookings); // Protected: User's rental history

module.exports = router;