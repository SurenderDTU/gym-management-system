const { pool } = require('../config/db');

module.exports = async function(req, res, next) {
    try {
        const gym_id = req.user.gym_id;
        const result = await pool.query('SELECT saas_status, saas_valid_until FROM gyms WHERE id = $1', [gym_id]);
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Gym not found" });
        const gym = result.rows[0];
        
        if (gym.saas_status === 'FREE_TRIAL') return next(); 
        if (!gym.saas_valid_until) return next();

        const now = new Date();
        const validUntil = new Date(gym.saas_valid_until);
        const diffDays = (validUntil - now) / (1000 * 60 * 60 * 24);

        // PHASE 2: SOFT LOCKOUT (Past 3 days expired)
        if (diffDays < -3) {
            if (gym.saas_status !== 'EXPIRED') {
                await pool.query("UPDATE gyms SET saas_status = 'EXPIRED' WHERE id = $1", [gym_id]);
            }
            return res.status(403).json({ error: "SAAS_EXPIRED", message: "Subscription expired. Please renew." });
        } 
        // PHASE 1: GRACE PERIOD (0 to 3 days expired)
        else if (diffDays < 0 && diffDays >= -3) {
            if (gym.saas_status !== 'GRACE_PERIOD') {
                await pool.query("UPDATE gyms SET saas_status = 'GRACE_PERIOD' WHERE id = $1", [gym_id]);
            }
            return next(); 
        }

        // ACTIVE PHASE
        if (gym.saas_status !== 'ACTIVE') {
            await pool.query("UPDATE gyms SET saas_status = 'ACTIVE' WHERE id = $1", [gym_id]);
        }
        next();
    } catch (err) {
        console.error("SaaS Middleware Error:", err);
        res.status(500).json({ error: "Server Error in SaaS Validation" });
    }
};