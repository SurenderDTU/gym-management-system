const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- 1. GET ALL PAYMENTS ---
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        const gym_id = 1;

        let query = `
            SELECT 
                p.id,
                p.user_id,
                p.invoice_id,
                p.transaction_id,
                p.amount_paid,
                p.amount_due,
                p.total_amount,
                p.payment_date,
                p.status,
                p.payment_mode,
                m.full_name as member_name,
                m.email as member_email,
                m.profile_pic,
                pl.name as plan_name,
                pl.duration_days
            FROM payments p
            JOIN members m ON p.user_id = m.id
            LEFT JOIN plans pl ON p.plan_id = pl.id
            WHERE p.gym_id = $1
        `;
        const params = [gym_id];

        if (search) {
            query += ` AND (m.full_name ILIKE $2 OR p.invoice_id ILIKE $2 OR p.transaction_id ILIKE $2)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY p.payment_date DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error("GET PAYMENTS ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

// --- 2. RECORD PAYMENT (SELF-CORRECTING LOGIC) ---
router.post('/record', async (req, res) => {
    const { user_id, plan_id, amount_paid, total_amount, payment_mode, notes, transaction_id } = req.body;
    const gym_id = 1;

    try {
        const amount_due = parseFloat(total_amount) - parseFloat(amount_paid);
        const status = amount_due > 0 ? 'Pending' : 'Completed';
        
        // 🛠️ BACKEND OVERRULE
        const auto_inv_id = `INV-${Date.now().toString().slice(-6)}`;
        
        // If it's a Razorpay ID (starts with pay_), or if mode is Online, use that ID
        const final_txn_id = (transaction_id && transaction_id.trim() !== '') ? transaction_id : auto_inv_id;
        
        // SYNC: Make Invoice ID match Transaction ID for Online success
        const final_invoice_id = (transaction_id && transaction_id.startsWith('pay_')) ? transaction_id : auto_inv_id;

        // FORCE MODE: If it looks online, save it as online
        const final_mode = (transaction_id && transaction_id.startsWith('pay_')) ? 'Online' : payment_mode;

        await pool.query('BEGIN'); 

        const newPayment = await pool.query(
            `INSERT INTO payments 
            (gym_id, user_id, plan_id, amount_paid, amount_due, total_amount, payment_mode, status, invoice_id, transaction_id, notes, payment_date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
            RETURNING *`,
            [gym_id, user_id, plan_id, parseFloat(amount_paid), amount_due, parseFloat(total_amount), final_mode, status, final_invoice_id, final_txn_id, notes || '']
        );

        const planResult = await pool.query("SELECT duration_days FROM plans WHERE id = $1", [plan_id]);
        
        if (planResult.rows.length > 0) {
            const days = planResult.rows[0].duration_days;
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + days);

            await pool.query(
                `INSERT INTO memberships (gym_id, member_id, plan_id, start_date, end_date, status)
                 VALUES ($1, $2, $3, $4, $5, 'ACTIVE')`,
                [gym_id, user_id, plan_id, startDate, endDate]
            );
        }

        await pool.query('COMMIT'); 
        res.json({ msg: "Payment Recorded!", payment: newPayment.rows[0] });

    } catch (err) {
        await pool.query('ROLLBACK'); 
        console.error("RECORD ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

// --- 3. STATS ---
router.get('/stats', async (req, res) => {
    try {
        const gym_id = 1;
        const revenue = await pool.query(`SELECT SUM(amount_paid) as total FROM payments WHERE gym_id = $1`, [gym_id]);
        const today = await pool.query(`SELECT SUM(amount_paid) as today FROM payments WHERE gym_id = $1 AND payment_date::date = CURRENT_DATE`, [gym_id]);
        const pending = await pool.query(`SELECT SUM(amount_due) as pending FROM payments WHERE gym_id = $1 AND status = 'Pending'`, [gym_id]);

        res.json({
            total_revenue: revenue.rows[0].total || 0,
            today_revenue: today.rows[0].today || 0,
            pending_dues: pending.rows[0].pending || 0
        });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// --- 4. CHART ---
router.get('/chart', async (req, res) => {
    try {
        const gym_id = 1;
        const { days } = req.query;
        const interval = days === '7' ? '7 days' : '30 days';

        const chartData = await pool.query(`
            SELECT 
                TO_CHAR(payment_date, 'YYYY-MM-DD') as date, 
                SUM(amount_paid) as revenue 
            FROM payments 
            WHERE gym_id = $1 AND payment_date > NOW() - INTERVAL '${interval}'
            GROUP BY TO_CHAR(payment_date, 'YYYY-MM-DD')
            ORDER BY date ASC
        `, [gym_id]);

        const cleanData = chartData.rows.map(row => ({
            date: row.date,
            revenue: parseInt(row.revenue) || 0
        }));

        res.json(cleanData);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// --- 5. HISTORY ---
router.get('/history/:member_id', async (req, res) => {
    try {
        const { member_id } = req.params;
        if (!member_id || member_id === 'undefined' || member_id === 'null') {
            return res.json([]); 
        }

        const history = await pool.query(`
            SELECT 
                payment_date, 
                amount_paid, 
                status, 
                invoice_id,
                transaction_id
            FROM payments 
            WHERE user_id = $1 
            ORDER BY payment_date DESC 
            LIMIT 5
        `, [member_id]);
        
        res.json(history.rows);
    } catch (err) {
        console.error("HISTORY ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const gym_id = 1;

        await pool.query('BEGIN'); // Start transaction

        // A. Get the user_id linked to this payment before deleting it
        const payInfo = await pool.query('SELECT user_id FROM payments WHERE id = $1 AND gym_id = $2', [id, gym_id]);
        
        if (payInfo.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ msg: "Record not found" });
        }
        const member_id = payInfo.rows[0].user_id;

        // B. Delete the specific payment record
        await pool.query('DELETE FROM payments WHERE id = $1 AND gym_id = $2', [id, gym_id]);

        // C. Delete the member's current membership
        await pool.query('DELETE FROM memberships WHERE member_id = $1', [member_id]);

        // D. Set member status back to UNPAID in members table
        await pool.query("UPDATE members SET status = 'UNPAID' WHERE id = $1", [member_id]);

        await pool.query('COMMIT'); // Finalize changes
        res.json({ msg: "Record deleted and membership reset to Unpaid" });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("DELETE ERROR:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;