const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure Image Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

// --- 1. GET ALL MEMBERS (FIXED FOR INACTIVE STATUS) ---
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.id, 
                m.full_name, 
                m.email, 
                m.phone, 
                m.joining_date, 
                m.profile_pic,
                -- 1. STATUS: Get latest from memberships
                COALESCE(ms_latest.status, 'UNPAID') as membership_status,
                -- 2. DAYS LEFT
                CASE 
                    WHEN ms_latest.end_date IS NULL THEN 0 
                    ELSE GREATEST(0, (ms_latest.end_date::date - CURRENT_DATE::date)) 
                END as days_left,
                -- 3. LAST VISIT: Use the column from the members table (for manual SQL updates)
                m.last_visit,
                -- 4. FINANCIAL DATA
                COALESCE((SELECT SUM(amount_paid) FROM payments WHERE user_id = m.id), 0) as total_paid,
                COALESCE((
                    SELECT json_agg(pay ORDER BY payment_date DESC) 
                    FROM payments pay WHERE pay.user_id = m.id
                ), '[]') as payment_history,
                -- 5. PLAN INFO
                ms_latest.plan_name,
                ms_latest.end_date as expiry_date
            FROM members m
            LEFT JOIN LATERAL (
                SELECT ms.status, ms.end_date, p.name as plan_name
                FROM memberships ms
                LEFT JOIN plans p ON ms.plan_id = p.id
                WHERE ms.member_id = m.id 
                ORDER BY ms.end_date DESC
                LIMIT 1
            ) ms_latest ON true
            ORDER BY m.id DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error("MEMBER LIST ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

// 2. MANUAL CHECK-IN
router.put('/:id/check-in', async (req, res) => {
    try {
        // We insert a record into the attendance table to keep history
        await pool.query(
            "INSERT INTO attendance (member_id, check_in_time) VALUES ($1, NOW())",
            [req.params.id]
        );
        // Also update the member table for quick reference
        await pool.query(
            "UPDATE members SET last_visit = NOW() WHERE id = $1",
            [req.params.id]
        );
        res.json({ message: "Member Checked In" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. POST: Add Member
router.post('/add', upload.single('profile_pic'), async (req, res) => {
  try {
    const { full_name, email, phone } = req.body;
    const profile_pic = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;
    const gym_id = 1; 

    const newMember = await pool.query(
        "INSERT INTO members (full_name, email, phone, profile_pic, gym_id, joining_date, last_visit) VALUES ($1, $2, $3, $4, $5, NOW(), NULL) RETURNING *",
        [full_name, email, phone, profile_pic, gym_id]
    );

    res.json(newMember.rows[0]);
 } catch (err) {
    console.error(err.message);
    // FIX: specific check for duplicate email error from Postgres
    if (err.code === '23505') {
        return res.status(400).json({ error: "This email is already registered to another member." });
    }
    res.status(500).send("Server Error");
  }
});

// 4. UPDATE MEMBER
router.put('/:id', auth, upload.single('profile_pic'), async (req, res) => {
    const { full_name, email, phone } = req.body;
    const profile_pic = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;

    try {
        if (profile_pic) {
            await pool.query(
                "UPDATE members SET full_name = $1, email = $2, phone = $3, profile_pic = $4 WHERE id = $5",
                [full_name, email, phone, profile_pic, req.params.id]
            );
        } else {
            await pool.query(
                "UPDATE members SET full_name = $1, email = $2, phone = $3 WHERE id = $4",
                [full_name, email, phone, req.params.id]
            );
        }
        res.json({ message: "Member updated" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 5. DELETE MEMBER
router.delete('/:id', auth, async (req, res) => {
    const memberId = req.params.id;

    try {
        await pool.query('BEGIN');
        // Update: Use user_id for payments delete to match new table structure
        await pool.query('DELETE FROM payments WHERE user_id = $1', [memberId]);
        await pool.query('DELETE FROM memberships WHERE member_id = $1', [memberId]);
        await pool.query('DELETE FROM attendance WHERE member_id = $1', [memberId]);
        await pool.query('DELETE FROM members WHERE id = $1', [memberId]);
        await pool.query('COMMIT');
        res.json({ message: "Member deleted" });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;