const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Loads the .env file

// Import Routes
const authRoutes = require('./routes/authRoutes');
const produceRoutes = require('./routes/produceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Allows server to understand JSON data from the frontend
app.use(cors());

// Serve Frontend Files
app.use(express.static(path.join(__dirname, 'public')));

// Use Routes (Directing traffic)
// Any request starting with /api/auth goes to the authRoutes file
app.use('/api/auth', authRoutes);

// Any request starting with /api/produce goes to the produceRoutes file (Handles our offline sync!)
app.use('/api/produce', produceRoutes);

// Start the Server
app.listen(PORT, () => {
    console.log(`🚀 KisanSetu Backend running on http://localhost:${PORT}`);
});