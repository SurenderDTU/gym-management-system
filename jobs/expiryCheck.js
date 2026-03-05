const { pool } = require('../config/db');

const checkExpirations = async () => {
    try {
        console.log("Running Expiry Janitor...");
        // Update any ACTIVE membership to EXPIRED if the end_date is in the past
        const result = await pool.query(`
            UPDATE memberships 
            SET status = 'EXPIRED' 
            WHERE end_date < CURRENT_DATE AND status = 'ACTIVE'
        `);
        console.log(`✅ Janitor finished. ${result.rowCount} memberships marked as expired.`);
    } catch (err) {
        console.error("Janitor Error:", err.message);
    }
};

module.exports = checkExpirations;