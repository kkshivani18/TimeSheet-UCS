const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    console.log('Auth middleware called');
    console.log('headers:', req.headers);
    console.log('auth header:', req.headers.authorization);

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No auth header provided' });

        const token = authHeader.split(' ')[1]; 
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ userId: decoded.userId });

        if (!user) return res.status(401).json({ message: 'Invalid token or user not found' });

        req.user = { 
            userId: decoded.userId, 
            email: decoded.email, 
            role: decoded.role 
        };
        console.log('User authenticated:', user.username);
        next();
    } catch (error) {
        console.log('Error authenticating user:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;