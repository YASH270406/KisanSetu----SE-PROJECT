const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

/**
 * Middleware to verify Supabase User JWT and create a per-request client (NFR-5.3)
 */
const verifySupabaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Create a request-specific client using the User's JWT
        const userSupabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        // 2. Security Check: Actually verify the token with Supabase
        const { data: { user }, error } = await userSupabase.auth.getUser();

        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
        }

        // 3. Attach both user and client to the request
        req.user = user;
        req.supabase = userSupabase;
        
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
    }
};

module.exports = verifySupabaseToken;
