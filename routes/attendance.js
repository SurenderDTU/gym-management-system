const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/authMiddleware');

// 1. Check-in a Member
router.post('/checkin', auth, async (req, res) => {
    const { member_id } = req.body;
    const gym_id = req.user.gym_id;

    try {
        // 1. Verify the member belongs to THIS gym and is ACTIVE
        const memberStatus = await pool.query(
            `SELECT status FROM memberships 
             WHERE member_id = $1 AND gym_id = $2`, 
            [member_id, gym_id]
        );

        if (memberStatus.rows.length === 0) {
            return res.status(404).json({ message: "No membership found for this person." });
        }

        if (memberStatus.rows[0].status !== 'ACTIVE') {
            return res.status(403).json({ message: "Access Denied: Membership is " + memberStatus.rows[0].status });
        }

        // 2. Record the attendance
        const newRecord = await pool.query(
            'INSERT INTO attendance (gym_id, member_id) VALUES ($1, $2) RETURNING *',
            [gym_id, member_id]
        );

        res.json({ message: "Check-in Successful! Welcome!", details: newRecord.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 2. Get Today's Attendance List (For the Owner's Dashboard)
router.get('/today', auth, async (req, res) => {
    try {
        const list = await pool.query(
            `SELECT attendance.*, members.full_name 
             FROM attendance 
             JOIN members ON attendance.member_id = members.id 
             WHERE attendance.gym_id = $1 AND attendance.check_in_time::date = CURRENT_DATE`,
            [req.user.gym_id]
        );
        res.json(list.rows);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;