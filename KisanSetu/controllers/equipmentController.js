// controllers/equipmentController.js
const supabaseGlobal = require('../config/supabase');

/**
 * Get all available equipment (Public Marketplace)
 * (NFR-5.3: Public Browse - Doesn't require JWT)
 */
const getAllEquipment = async (req, res) => {
    try {
        const { data: equipment, error } = await supabaseGlobal
            .from('equipment')
            .select(`
                *,
                owner:owner_id (full_name)
            `)
            .eq('status', 'Available')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data: equipment });
    } catch (error) {
        console.error("Supabase Error fetching equipment:", error);
        res.status(500).json({ success: false, message: 'Server Error fetching equipment' });
    }
};

/**
 * Create a new booking
 * (NFR-5.3: Protected - Uses JWT Request Client)
 */
const createBooking = async (req, res) => {
    const { equipmentId, startDate, endDate, totalCost } = req.body;
    const farmerId = req.user.id; // From authMiddleware

    try {
        // Use req.supabase (Per-Request Client) to respect RLS
        const { data: overlaps, error: overlapError } = await req.supabase
            .from('bookings')
            .select('*')
            .eq('equipment_id', equipmentId)
            .eq('status', 'Approved')
            .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

        if (overlapError) throw overlapError;

        if (overlaps && overlaps.length > 0) {
            return res.status(400).json({ success: false, message: 'Equipment is already booked for these dates.' });
        }

        if (dbError) throw dbError;

        // 3. Notify the Equipment Owner (FR-7.1)
        try {
            // Get equipment name and owner ID
            const { data: eqInfo } = await req.supabase
                .from('equipment')
                .select('name, owner_id')
                .eq('id', equipmentId)
                .single();

            if (eqInfo) {
                const farmerName = req.user.user_metadata?.full_name || 'A farmer';
                
                await req.supabase
                    .from('notifications')
                    .insert([{
                        user_id: eqInfo.owner_id,
                        title: '📥 New Booking Request!',
                        message: `${farmerName} has requested to rent your "${eqInfo.name}".`,
                        type: 'warning', // Shows up as "Action Required"
                        source: 'equipment'
                    }]);
            }
        } catch (notifErr) {
            console.warn("Non-critical Error: Could not send owner notification.", notifErr);
            // We don't fail the whole booking if the notification fails
        }

        res.status(201).json({ success: true, message: 'Booking request sent to owner!' });

    } catch (error) {
        console.error("Supabase Error during booking:", error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create booking' });
    }
};

/**
 * Get bookings for the current user
 * (NFR-5.3: Protected - Uses JWT Request Client)
 */
const getMyBookings = async (req, res) => {
    try {
        // Use req.supabase (Per-Request Client) to respect RLS
        const { data: bookings, error } = await req.supabase
            .from('bookings')
            .select(`
                *,
                equipment:equipment_id (name, type, hourly_rate)
            `)
            .eq('farmer_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data: bookings });
    } catch (error) {
        console.error("Supabase Error fetching bookings:", error);
        res.status(500).json({ success: false, message: 'Server Error fetching bookings' });
    }
};

module.exports = { getAllEquipment, createBooking, getMyBookings };