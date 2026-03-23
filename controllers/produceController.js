// controllers/produceController.js
const connectDB = require('../config/db');

// --- ADD SINGLE LIVE CROP LISTING ---
const addProduce = async (req, res) => {
    // These names now perfectly match what sell_produce.js is sending
    const { crop, variety, quantity, unit, price, harvestDate } = req.body;

    if (!crop || !quantity || !price) {
        return res.status(400).json({ success: false, message: 'Missing required crop details.' });
    }

    try {
        const db = await connectDB();
        const createdAt = new Date().toISOString();

        await db.run(
            `INSERT INTO Produce (cropName, variety, quantity, unit, price, harvestDate, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [crop, variety, quantity, unit, price, harvestDate, createdAt]
        );

        console.log(`🌾 New Live Crop Listed: ${quantity}${unit} of ${crop}`);
        res.status(201).json({ success: true, message: 'Produce listed successfully!' });

    } catch (error) {
        console.error("Database Error adding produce:", error);
        res.status(500).json({ success: false, message: 'Failed to list produce.' });
    }
};

// --- SYNC OFFLINE DATA (Bulk Upload) ---
const syncProduce = async (req, res) => {
    // Expects an array of items sent from the frontend localStorage
    const offlineItems = req.body.items; 

    if (!offlineItems || !Array.isArray(offlineItems) || offlineItems.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data to sync.' });
    }

    try {
        const db = await connectDB();
        let syncedCount = 0;

        for (let item of offlineItems) {
            await db.run(
                `INSERT INTO Produce (cropName, variety, quantity, unit, price, harvestDate, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [item.crop, item.variety, item.quantity, item.unit, item.price, item.harvestDate, new Date().toISOString()]
            );
            syncedCount++;
        }

        console.log(`🔄 Bulk Synced ${syncedCount} offline listings to the cloud!`);
        res.status(200).json({ success: true, message: `Successfully synced ${syncedCount} items.` });

    } catch (error) {
        console.error("Database Error syncing produce:", error);
        res.status(500).json({ success: false, message: 'Failed to sync offline data.' });
    }
};

// --- FETCH ALL PRODUCE ---
const getAllProduce = async (req, res) => {
    try {
        const db = await connectDB();
        const produceList = await db.all(`SELECT * FROM Produce WHERE status = 'Available' ORDER BY id DESC`);
        res.status(200).json({ success: true, data: produceList });
    } catch (error) {
        console.error("Database Error fetching produce:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch marketplace data.' });
    }
};

module.exports = { addProduce, getAllProduce, syncProduce };