const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

const connectDB = async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database Connected!');

        // READ THE SQL FILE WE JUST MADE
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // RUN THE SQL TO CREATE TABLES
        await pool.query(sql);
        console.log('✅ Tables Created (Gyms & Users)!');

    } catch (err) {
        console.error('❌ Database Error:', err.message);
        process.exit(1);
    }
};

module.exports = { pool, connectDB };