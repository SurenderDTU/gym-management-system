const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { getDefaultPermissionsByStaffRole } = require('../middleware/rbac');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET === 'gymvault_dev_secret_2026') {
    throw new Error('FATAL: JWT_SECRET is missing or insecure.');
}

// POST /api/auth/register-owner
// Creates a new gym + owner account securely. Includes Self-Healing for deleted HQ accounts.
router.post('/register-owner', async (req, res) => {
    const { gym_name, full_name, email, password } = req.body;

    if (!gym_name || !full_name || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        await pool.query('BEGIN'); // Start transaction for safety

        // 🚨 THE SELF-HEALING GHOST CHECK 🚨
        // If the email exists, check if their gym was deleted by the Super Admin.
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            const oldGymId = existingUser.rows[0].gym_id;
            const gymStillExists = await pool.query('SELECT id FROM gyms WHERE id = $1', [oldGymId]);
            
            if (gymStillExists.rows.length === 0 || oldGymId === null) {
                // The gym was deleted! This is a ghost account. Delete it so they can register fresh.
                await pool.query('DELETE FROM users WHERE email = $1', [email]);
            } else {
                // The gym still exists, so it's a real duplicate. Block it.
                await pool.query('ROLLBACK');
                return res.status(400).json({ message: "An account with this email already exists." });
            }
        }

        // Encrypt the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newGym = await pool.query(
            'INSERT INTO gyms (name) VALUES ($1) RETURNING id',
            [gym_name]
        );
        const gymId = newGym.rows[0].id;

        const newUser = await pool.query(
            `INSERT INTO users (gym_id, full_name, email, password_hash, role, staff_role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [gymId, full_name, email, hashedPassword, 'OWNER', 'OWNER', true]
        );

        await pool.query('COMMIT');

        return res.json({
            message: "Gym and Owner created successfully!",
            gym_id: gymId,
            user_id: newUser.rows[0].id
        });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("REGISTER ERROR:", err.message);
        if (err.code === '23505') {
            return res.status(400).json({ message: "An account with this email already exists." });
        }
        return res.status(500).json({ message: "Server Error" });
    }
});

// POST /api/auth/login
// SECURE MODE: Authenticates using strict email checks and bcrypt password verification.
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    try {
        // 1. Verify email AND fetch the gym's is_active status (THE KILL SWITCH CHECK)
        const userResult = await pool.query(
            `SELECT u.*, g.is_active AS gym_is_active, g.gym_access_status
             FROM users u 
             JOIN gyms g ON u.gym_id = g.id 
             WHERE u.email = $1`, 
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const user = userResult.rows[0];

        // 🚨 CHECK THE KILL SWITCH 🚨
        if (user.gym_is_active === false) {
            return res.status(403).json({ message: "Account Suspended. Please contact GymVault HQ." });
        }

        const accessStatus = String(user.gym_access_status || 'ACTIVE').toUpperCase();
        if (accessStatus === 'BLOCKED') {
            return res.status(403).json({ message: 'Gym account is blocked by HQ. Contact support.' });
        }
        if (accessStatus === 'SUSPENDED') {
            return res.status(403).json({ message: 'Gym account is suspended by HQ. Contact support.' });
        }

        if (user.is_active === false) {
            return res.status(403).json({ message: "Staff account is inactive. Contact gym owner." });
        }

        // 2. Securely verify the password typed against the database hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        // 3. Issue the JWT Token ONLY if the password is correct
        const permissions = String(user.role || '').toUpperCase() === 'OWNER'
            ? ['*']
            : (Array.isArray(user.permissions)
                ? user.permissions
                : getDefaultPermissionsByStaffRole(user.staff_role));

        const token = jwt.sign(
            {
                user: {
                    id: user.id,
                    gym_id: user.gym_id,
                    role: user.role,
                    staff_role: user.staff_role,
                    permissions,
                    is_active: user.is_active,
                }
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        return res.json({
            token,
            message: "Login successful!",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                gym_id: user.gym_id,
                role: user.role,
                staff_role: user.staff_role,
                is_active: user.is_active,
                permissions,
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err.message);
        return res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;