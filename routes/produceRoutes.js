const express = require('express');
const router = express.Router();
const produceController = require('../controllers/produceController');

// POST route to handle incoming synced data
router.post('/sync', produceController.syncProduce);

module.exports = router;