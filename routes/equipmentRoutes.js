// routes/equipmentRoutes.js
const express = require('express');
const router = express.Router();
const { getAllEquipment, createBooking, getMyBookings } = require('../controllers/equipmentController');

router.get('/list', getAllEquipment);
router.post('/book', createBooking);
router.get('/my-bookings', getMyBookings);

module.exports = router;