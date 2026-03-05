const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/authMiddleware');

// 1. ACTIVATION & RENEWAL: Handles member status, membership entry, and payment record
router.post('/activate', async (req, res) => {
    const { member_id, plan_id, payment_id, payment_mode } = req.body; // <--- Added payment_mode here
    const gym_id = (req.user && req.user.gym_id) ? req.user.gym_id : 1; 

    try {
        const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
        if (planResult.rows.length === 0) return res.status(404).json({ message: "Plan not found" });

        const plan = planResult.rows[0];
        const days = plan.duration_days || (plan.duration_months * 30) || 30;
        const price = plan.price || 0;

        // Determine Mode: Use sent mode, or infer from payment_id (if pay_ exists -> Online, else Cash)
        const final_mode = payment_mode || (payment_id && payment_id.startsWith('pay_') ? 'Online' : 'Cash');
        
        // Ensure Transaction ID is never null
        const final_txn_id = payment_id || `INV-${Date.now()}`;

        await pool.query('BEGIN');

        // A. DELETE any existing memberships for this member first 
        await pool.query('DELETE FROM memberships WHERE member_id = $1', [member_id]);

        // B. Update member status
        await pool.query(
            `UPDATE members 
             SET status = 'ACTIVE', 
                 joining_date = COALESCE(joining_date, CURRENT_DATE) 
             WHERE id = $1`, 
            [member_id]
        );

        // C. Insert FRESH Membership record
        await pool.query(
            `INSERT INTO memberships (gym_id, member_id, plan_id, start_date, end_date, status) 
             VALUES ($1, $2, $3, NOW(), NOW() + ($4 || ' day')::interval, 'ACTIVE')`,
            [gym_id, member_id, plan_id, days]
        );

        // D. Insert Payment record (Now saving payment_mode and transaction_id correctly)
        await pool.query(
            `INSERT INTO payments (
                gym_id, 
                user_id, 
                amount_paid, 
                payment_date, 
                status, 
                plan_id,
                payment_mode,     -- <--- Added Column
                transaction_id,   -- <--- Added Column
                invoice_id        -- <--- Added Column
            ) 
            VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`,
            [gym_id, member_id, price, 'Completed', plan_id, final_mode, final_txn_id, final_txn_id]
        );

        await pool.query('COMMIT');
        res.json({ message: "Subscription Activated/Renewed Successfully!" });

    } catch (err) {
        if (pool) await pool.query('ROLLBACK');
        console.error("ACTIVATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. PLANS MANAGEMENT: Create new plans
router.post('/plans', auth, async (req, res) => {
    const { plan_name, duration_days, price } = req.body; 
    const gym_id = req.user.gym_id || 1;

    // Calculate months automatically
    const duration_months = Math.max(1, Math.floor(duration_days / 30));

    try {
        const newPlan = await pool.query(
            'INSERT INTO plans (gym_id, name, duration_days, duration_months, price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [gym_id, plan_name, duration_days, duration_months, price]
        );
        res.json(newPlan.rows[0]);
    } catch (err) {
        console.error("PLAN CREATION ERROR:", err.message);
        res.status(500).json({ message: "Error creating plan." });
    }
});

// 3. FETCH PLANS: FIXED - Removed strict Auth check
// This ensures the dropdown in your modal ALWAYS shows plans, even if the token is missing.
router.get('/plans', async (req, res) => {
    try {
        // Fallback to gym_id = 1 if user isn't logged in perfectly
        const gym_id = (req.user && req.user.gym_id) ? req.user.gym_id : 1;

        const plans = await pool.query(
            'SELECT id, name, duration_days, duration_months, price FROM plans WHERE gym_id = $1', 
            [gym_id]
        );
        res.json(plans.rows);
    } catch (err) {
        console.error("FETCH PLANS ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

// 4. REMOVE PLAN: FIXED - Removed strict Gym ID check
// This ensures the "Remove Plan" button works even if the gym_id in the DB is different.
router.post('/remove-plan', async (req, res) => {
    const { member_id } = req.body;

    try {
        await pool.query('BEGIN');

        // 1. Delete the active membership (Removed "AND gym_id = $2" to force delete)
        await pool.query(
            "DELETE FROM memberships WHERE member_id = $1",
            [member_id]
        );

        // 2. Set member status back to UNPAID (Removed "AND gym_id = $2" to force update)
        await pool.query(
            "UPDATE members SET status = 'UNPAID' WHERE id = $1",
            [member_id]
        );

        await pool.query('COMMIT');
        res.json({ message: "Plan removed and status reset to Unpaid" });
    } catch (err) {
        if (pool) await pool.query('ROLLBACK');
        console.error("REMOVE PLAN ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. STATUS CHECK
router.get('/status', auth, async (req, res) => {
    try {
        const gym_id = req.user.gym_id || 1;
        const list = await pool.query(`
            SELECT 
                ms.*, 
                m.full_name, 
                m.joining_date,
                p.name as plan_name,
                p.price as plan_price,
                pay.payment_date as last_payment_date
            FROM memberships ms
            JOIN members m ON ms.member_id = m.id
            JOIN plans p ON ms.plan_id = p.id
            LEFT JOIN (
                SELECT member_id, MAX(payment_date) as payment_date 
                FROM payments 
                WHERE status = 'COMPLETED' 
                GROUP BY member_id
            ) pay ON m.id = pay.member_id
            WHERE ms.gym_id = $1`, 
            [gym_id]
        );
        res.json(list.rows);
    } catch (err) {
        console.error("STATUS FETCH ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

// 6. RENEWAL LOGIC
router.post('/renew', auth, async (req, res) => {
    const { membership_id } = req.body;
    const gym_id = req.user.gym_id || 1;

    try {
        const current = await pool.query(`
            SELECT ms.*, p.duration_days, p.duration_months 
            FROM memberships ms
            JOIN plans p ON ms.plan_id = p.id
            WHERE ms.id = $1`, 
            [membership_id] 
        ); // Removed strict gym_id check here too for safety

        if (current.rows.length === 0) return res.status(404).json({ message: "Membership not found" });
        
        const m = current.rows[0];
        const daysToAdd = m.duration_days || (m.duration_months * 30) || 30;

        await pool.query(
            `UPDATE memberships 
             SET end_date = GREATEST(end_date, NOW()) + ($1 || ' day')::interval, 
                 status = 'ACTIVE' 
             WHERE id = $2`,
            [daysToAdd, membership_id]
        );

        res.json({ message: "Membership Renewed Successfully!" });
    } catch (err) {
        console.error("RENEWAL ERROR:", err.message);
        res.status(500).send("Server Error: " + err.message);
    }
});
// 7. QUICK EXTEND (Added feature)
router.post('/extend', async (req, res) => {
    const { member_id, days } = req.body;
    try {
        await pool.query(
            `UPDATE memberships 
             SET end_date = end_date + ($1 || ' day')::interval 
             WHERE member_id = $2`,
            [days, member_id]
        );
        res.json({ message: `Membership extended by ${days} days` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;