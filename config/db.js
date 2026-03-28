// config/db.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function connectDB() {
    const db = await open({
        filename: './data/kisansetu.db', // Saved inside your 'data' folder
        driver: sqlite3.Database
    });

    // 1. Users Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            profileImage TEXT,
            fullName TEXT NOT NULL,
            mobileNum TEXT UNIQUE NOT NULL,
            pincode TEXT,
            userRole TEXT NOT NULL,
            password TEXT NOT NULL
        )
    `);

    // 2. Equipment Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Equipment (
            id TEXT PRIMARY KEY,
            name TEXT, type TEXT, emoji TEXT, model TEXT,
            hp INTEGER, usageHours INTEGER, hourlyRate INTEGER,
            location TEXT, distanceKm INTEGER, owner TEXT, status TEXT
        )
    `);

    // 3. Bookings Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Bookings (
            bookingId TEXT PRIMARY KEY,
            equipmentId TEXT, equipName TEXT, equipEmoji TEXT, owner TEXT,
            hourlyRate INTEGER, startDate TEXT, endDate TEXT,
            hoursPerDay INTEGER, days INTEGER, totalCost INTEGER,
            purpose TEXT, status TEXT, createdAt TEXT
        )
    `);

    // 4. Produce / Crop Listings Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Produce (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmerName TEXT DEFAULT 'Ramesh (Demo)', 
            cropName TEXT NOT NULL,
            variety TEXT,
            quantity TEXT NOT NULL,
            unit TEXT NOT NULL,
            price TEXT NOT NULL,
            harvestDate TEXT,
            status TEXT DEFAULT 'Available',
            createdAt TEXT
        )
    `);


    // Seed dummy equipment if the table is empty
    const eqCount = await db.get(`SELECT COUNT(*) as count FROM Equipment`);
    if (eqCount.count === 0) {
        await db.exec(`
            INSERT INTO Equipment (id, name, type, emoji, model, hp, usageHours, hourlyRate, location, distanceKm, owner, status)
            VALUES 
            ('EQ001', 'Mahindra 575 DI', 'Tractor', '🚜', 'Mahindra XP Plus', 45, 1200, 150, 'Rohtak, HR', 4, 'Balram Singh', 'available'),
            ('EQ003', 'Claas Crop Tiger', 'Harvester', '🌾', 'Claas 30 GO', 62, 450, 350, 'Hisar, HR', 30, 'Kisan Co-op', 'available'),
            ('EQ006', 'DJI Agras T40', 'Drone', '🛸', 'Agras T40', 0, 180, 500, 'Sonipat, HR', 46, 'AgroTech', 'available')
        `);
    }

    console.log("✅ Database Connected & Tables Verified.");
    return db;
}

module.exports = connectDB;