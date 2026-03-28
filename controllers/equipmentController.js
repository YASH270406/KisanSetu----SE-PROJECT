// controllers/equipmentController.js
const connectDB = require('../config/db');

// Get all available equipment
const getAllEquipment = async (req, res) => {
    try {
        const db = await connectDB();
        const equipment = await db.all(`SELECT * FROM Equipment`);
        res.status(200).json({ success: true, data: equipment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error fetching equipment' });
    }
};

// Create a new booking
const createBooking = async (req, res) => {
    const { bookingId, equipmentId, equipName, equipEmoji, owner, hourlyRate, startDate, endDate, hoursPerDay, days, totalCost, purpose, status, createdAt } = req.body;

    try {
        const db = await connectDB();
        await db.run(
            `INSERT INTO Bookings (bookingId, equipmentId, equipName, equipEmoji, owner, hourlyRate, startDate, endDate, hoursPerDay, days, totalCost, purpose, status, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [bookingId, equipmentId, equipName, equipEmoji, owner, hourlyRate, startDate, endDate, hoursPerDay, days, totalCost, purpose, status, createdAt]
        );
        res.status(201).json({ success: true, message: 'Booking created successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
};

// Get bookings for the current user
const getMyBookings = async (req, res) => {
    try {
        const db = await connectDB();
        // In a real app, you would filter by the logged-in user's ID here
        const bookings = await db.all(`SELECT * FROM Bookings ORDER BY createdAt DESC`);
        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error fetching bookings' });
    }
};

module.exports = { getAllEquipment, createBooking, getMyBookings };