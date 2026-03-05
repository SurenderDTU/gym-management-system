const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET ALL USERS (For Dropdowns)
// In routes/users.js
router.get('/', async (req, res) => {
    try {
        // 👇 The Fix: "name AS full_name"
        const result = await pool.query(
            "SELECT id, name AS full_name, email FROM users WHERE gym_id = 1 ORDER BY name ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;