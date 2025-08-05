const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error checking admin status' });
    }
};

module.exports = adminMiddleware;