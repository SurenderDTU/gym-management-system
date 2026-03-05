// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 
const { pool } = require('../config/db');

// Registration Route
router.post('/register-owner', async (req, res) => {
    const { gym_name, full_name, email, password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newGym = await pool.query(
            'INSERT INTO gyms (name) VALUES ($1) RETURNING id',
            [gym_name]
        );
        const gymId = newGym.rows[0].id;

        const newUser = await pool.query(
            'INSERT INTO users (gym_id, full_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [gymId, full_name, email, hashedPassword, 'OWNER']
        );

        return res.json({
            message: "Gym and Owner created successfully!",
            gym_id: gymId,
            user_id: newUser.rows[0].id
        });

    } catch (err) {
        console.error(err.message);
        return res.status(500).send("Server Error");
    }
});

// LOGIN BYPASS VERSION
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Look for the user
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "User not found in database" });
        }

        const user = userResult.rows[0];

        // 2. Generate Token
        const token = jwt.sign(
          { user: { id: user.id, gym_id: user.gym_id } },
          process.env.JWT_SECRET, 
          { expiresIn: '30d' } 
        );

        // 3. Send Response (ONLY ONCE)
        return res.json({
            token: token,
            message: "Login successful (BYPASS ENABLED)!"
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        return res.status(500).send("Server Error");
    }
});

module.exports = router;