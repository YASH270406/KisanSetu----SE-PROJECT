// controllers/produceController.js
const supabase = require('../config/supabase');

// --- ADD SINGLE LIVE CROP LISTING ---
const addProduce = async (req, res) => {
    const { crop, variety, quantity, unit, price, harvestDate, images } = req.body;
    const farmer_id = req.user.id; // From authMiddleware

    if (!crop || !quantity || !price) {
        return res.status(400).json({ success: false, message: 'Missing required crop details.' });
    }

    // Convert quantity to KG for standardized storage (FR-3.1)
    let quantity_kg = parseFloat(quantity);
    if (unit && unit.toLowerCase().includes('quintal')) {
        quantity_kg = quantity_kg * 100;
    }

    try {
        const { data, error } = await supabase
            .from('produce')
            .insert([
                {
                    farmer_id: farmer_id,
                    crop_name: crop,
                    variety: variety,
                    quantity_kg: quantity_kg,
                    expected_price: parseFloat(price),
                    harvest_date: harvestDate,
                    images: images || []
                }
            ]);

        if (error) throw error;

        console.log(`🌾 New Live Crop Listed in Cloud: ${quantity_kg}kg of ${crop}`);
        res.status(201).json({ success: true, message: 'Produce listed successfully in the cloud!' });

    } catch (error) {
        console.error("Supabase Error adding produce:", error);
        res.status(500).json({ success: false, message: 'Failed to list produce in the cloud.' });
    }
};

// --- SYNC OFFLINE DATA (Bulk Upload) ---
const syncProduce = async (req, res) => {
    const offlineItems = req.body.items; 
    const farmer_id = req.user.id;

    if (!offlineItems || !Array.isArray(offlineItems) || offlineItems.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data to sync.' });
    }

    try {
        const formattedItems = offlineItems.map(item => {
            let qty_kg = parseFloat(item.quantity);
            if (item.unit && item.unit.toLowerCase().includes('quintal')) {
                qty_kg = qty_kg * 100;
            }
            return {
                farmer_id: farmer_id,
                crop_name: item.crop,
                variety: item.variety,
                quantity_kg: qty_kg,
                expected_price: parseFloat(item.price),
                harvest_date: item.harvestDate,
                images: item.images || []
            };
        });

        const { error } = await supabase
            .from('produce')
            .insert(formattedItems);

        if (error) throw error;

        console.log(`🔄 Bulk Synced ${formattedItems.length} offline listings to Supabase!`);
        res.status(200).json({ success: true, message: `Successfully synced ${formattedItems.length} items.` });

    } catch (error) {
        console.error("Supabase Error syncing produce:", error);
        res.status(500).json({ success: false, message: 'Failed to sync offline data to the cloud.' });
    }
};

// --- FETCH ALL PRODUCE ---
const getAllProduce = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('produce')
            .select('*')
            .eq('status', 'Available')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data: data });
    } catch (error) {
        console.error("Supabase Error fetching produce:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch marketplace data.' });
    }
};

module.exports = { addProduce, getAllProduce, syncProduce };