const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Inside your dashboard stats route
router.get('/stats', async (req, res) => {
    try {
        const gym_id = 1; // Or req.user.gym_id

        // 1. Get Active Members
      // New robust count (Ignores ghosts)
const activeMembers = await pool.query(`
    SELECT COUNT(*) 
    FROM memberships ms
    JOIN members m ON ms.member_id = m.id 
    WHERE ms.status = 'ACTIVE'
`);

        // 2. Get Total Earnings (FIXED COLUMN NAME)
        const totalEarnings = await pool.query(
            "SELECT SUM(amount_paid) as total FROM payments WHERE gym_id = $1", 
            [gym_id]
        );

        // 3. Get Expiring Members
        const expiringSoon = await pool.query(
            "SELECT COUNT(*) FROM memberships WHERE end_date <= CURRENT_DATE + INTERVAL '7 days' AND status = 'ACTIVE' AND gym_id = $1",
            [gym_id]
        );

        res.json({
            active_members: activeMembers.rows[0].count,
            total_earnings: totalEarnings.rows[0].total || 0, // This feeds your counter
            inactive_members: expiringSoon.rows[0].count
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Dashboard Stats Error");
    }
});

module.exports = router;