const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const fs = require('fs'); 
const path = require('path'); // <--- ADD THIS

// Import Jobs and Middleware
const checkExpirations = require('./jobs/expiryCheck');
const auth = require('./middleware/authMiddleware');

// Import Routes
const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plans');
const memberRoutes = require('./routes/members');
const membershipRoutes = require('./routes/memberships');
const paymentRoutes = require('./routes/payments');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

app.use('/api/users', require('./routes/users'));

// Database Connection
connectDB();

// Create uploads folder if missing
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- IMAGE LOADING FIX ---
// Use path.join to make it work on Windows/Mac/Linux
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth Status Check
app.get('/api/auth/me', auth, (req, res) => {
    res.json({
        message: "You are authorized!",
        your_user_id: req.user.user_id,
        your_gym_id: req.user.gym_id,
        your_role: req.user.role
    });
});

app.get('/', (req, res) => {
    res.send('Gym Management System API: Online');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Expiration Janitor
setInterval(() => {
    checkExpirations();
}, 1000 * 60 * 60); 

checkExpirations();