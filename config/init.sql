-- This creates the 'gyms' table (The bucket for all gym owners)
CREATE TABLE IF NOT EXISTS gyms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- This creates the 'users' table (The people who log in)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    gym_id INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'OWNER', -- OWNER, STAFF, or MEMBER
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The Menu of what the gym offers
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    gym_id INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL, -- e.g., 30 for a month
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The People list
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    gym_id INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The link: Who bought what and when does it expire?
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    gym_id INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, FROZEN
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- The Payment Ledger (The most important table for the owner)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    gym_id INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    membership_id INTEGER REFERENCES memberships(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- CASH, ONLINE, CARD
    transaction_id VARCHAR(100), -- For future Razorpay/Stripe IDs
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- The Attendance Log (Who walked in and when?)
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    gym_id INTEGER REFERENCES gyms(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);