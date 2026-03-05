const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ message: 'No token, access denied' });
    }

    try {
        // Use process.env.JWT_SECRET. If it's missing, it defaults to 'secret'
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        
        // This attaches the user/gym data to the request
        req.user = decoded.user || decoded; 
        next();
    } catch (err) {
        console.log("JWT Error Details:", err.message); // Look at your terminal for this!
        res.status(401).json({ message: 'Invalid Token' });
    }
};