const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../config/db');
const auth = require('../middleware/authMiddleware');
const { requireOwner } = require('../middleware/rbac');

router.use(auth, requireOwner);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- 1. CREATE DYNAMIC SAAS ORDER ---
router.post('/create-order', auth, async (req, res) => {
    try {
        // FIX: Now reads the actual amount sent from the frontend!
        const amountToCharge = req.body.amount ? parseInt(req.body.amount) : 1999;
        
        const options = {
            amount: amountToCharge * 100, // convert to paise
            currency: "INR",
            receipt: `master_saas_${req.user.gym_id}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("RAZORPAY ORDER ERROR:", error);
        res.status(500).json({ error: "Failed to initiate payment" });
    }
});

// --- 2. VERIFY & SAVE PLAN ---
router.post('/verify', auth, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_tier, cycle } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

    if (razorpay_signature === expectedSign) {
        try {
            await pool.query('BEGIN');
            const targetPlan = plan_tier || 'pro';
            const targetCycle = cycle || 'monthly';
            const daysToAdd = targetCycle === 'annual' ? 365 : 30;

            await pool.query(
                `UPDATE gyms 
                 SET saas_status = 'ACTIVE', 
                     current_plan = $1,
                     saas_billing_cycle = $2,
                     saas_valid_until = CURRENT_TIMESTAMP + ($3 || ' days')::interval 
                 WHERE id = $4`,
                [targetPlan, targetCycle, daysToAdd, req.user.gym_id]
            );

            await pool.query('COMMIT');
            res.json({ message: "Subscription activated!" });
        } catch (err) {
            await pool.query('ROLLBACK');
            res.status(500).json({ error: "DB Error" });
        }
    } else {
        res.status(400).json({ error: "Invalid signature!" });
    }
});
module.exports = router;