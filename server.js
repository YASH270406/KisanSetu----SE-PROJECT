const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); 

// Import your database connection
const connectDB = require('./config/db'); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const produceRoutes = require('./routes/produceRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/produce', produceRoutes);
app.use('/api/equipment', equipmentRoutes); 

// Start the Server AND force the database to build instantly
app.listen(PORT, async () => {
    console.log(`🚀 KisanSetu Backend running on http://localhost:${PORT}`);
    
    try {
        await connectDB(); // This line creates kisansetu.db instantly!
    } catch (error) {
        console.error("❌ Failed to initialize database on startup:", error);
    }
});
