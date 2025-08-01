const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.user.id });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
        req.adminUser = user;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all users 
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID (admin only)
router.get('/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId }).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user role (admin only)
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        
        const user = await User.findOneAndUpdate(
            { userId: req.params.userId },
            { role, updatedAt: new Date() },
            { new: true }
        ).select('-passwordHash');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete user (admin only)
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;