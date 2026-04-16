const express = require('express');
const router = express.Router();

// Import the logic from the controller
const { addProduce, getAllProduce, syncProduce } = require('../controllers/produceController');
const verifyToken = require('../middleware/authMiddleware');

// 1. Route to handle a single new crop listing (Protected)
router.post('/add', verifyToken, addProduce);

// 2. Route to fetch all available crops for the marketplace (Public)
router.get('/list', getAllProduce);

// 3. Route to handle offline-to-online data sync (Protected)
router.post('/sync', verifyToken, syncProduce);

module.exports = router;