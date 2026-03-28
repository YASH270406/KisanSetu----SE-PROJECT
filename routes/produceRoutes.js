const express = require('express');
const router = express.Router();

// Import the logic from the controller
const { addProduce, getAllProduce, syncProduce } = require('../controllers/produceController');

// 1. Route to handle a single new crop listing
router.post('/add', addProduce);

// 2. Route to fetch all available crops for the marketplace
router.get('/list', getAllProduce);

// 3. Route to handle offline-to-online data sync (Bulk upload)
router.post('/sync', syncProduce);

module.exports = router;