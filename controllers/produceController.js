const fs = require('fs');
const path = require('path');

// Point to the data folder
const dataFilePath = path.join(__dirname, '../data/produce_listings.json');

exports.syncProduce = (req, res) => {
    try {
        const newListing = req.body;
        let listings = [];

        // 1. Check if file exists and read it safely
        if (fs.existsSync(dataFilePath)) {
            const fileData = fs.readFileSync(dataFilePath, 'utf-8');
            // Only try to parse if the file is not empty
            if (fileData.trim() !== '') {
                listings = JSON.parse(fileData);
            }
        }

        // 2. Add the new incoming data to the array
        listings.push(newListing);

        // 3. Ensure the 'data' folder exists, create it automatically if it doesn't
        const dir = path.dirname(dataFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // 4. Write the updated array back to the JSON file safely
        fs.writeFileSync(dataFilePath, JSON.stringify(listings, null, 2));
        console.log("✅ Successfully saved to JSON:", newListing.crop);

        // 5. Send a success response back to the frontend
        res.status(201).json({ message: 'Listing successfully synced to the market!', data: newListing });
        
    } catch (error) {
        console.error("❌ Backend Error saving JSON:", error);
        res.status(500).json({ error: 'Failed to sync data to the server' });
    }
};