const express = require('express');
const { userSignUpSchema, userLoginSchema } = require('../models/user.zod');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid')
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/signup', async(req, res) => {
    const parseResult = userSignUpSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ errors: parseResult.error.errors });
    }
    const { email, password, username } = parseResult.data;
    try {
        // check if user already exists
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already in use' });

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
        userId: nanoid(28),
        email,
        passwordHash,
        username,
        role: 'user'
        });
        await user.save();

        // Create JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '3h' });

        res.status(201).json({ token, userId: user.userId });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/login', async(req, res) => {
    const parseResult = userLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
        return res.status(400).json({ errors: parseResult.error.errors });
    }
    const { email, password } = parseResult.data;
    try{
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, userId: user.userId, username: user.username, role: user.role }); 
    } catch (err){
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/authenticate', authMiddleware, async(req, res) => {
    const user = await User.findOne({ userId: req.user.id }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
})


// for Dashboard.js
// router.get('/:id', async(req, res) => {
//     try {
//         const user = await User.findOne({ userId: req.params.id });
//         if (!user) return res.status(404).json({ message: 'User not found' });
//         res.json({ username: user.username, email: user.email, role: user.role });
//       } catch (err) {
//         res.status(500).json({ message: err.message });
//     }
// })

router.get('/:userId', async (req, res) => {
    try {
        console.log('Looking for user with userId:', req.params.userId);
        
        // find user by userId 
        let user = await User.findOne({ userId: req.params.userId });
        
        // try by _id
        if (!user) {
            user = await User.findById(req.params.userId);
        }
        
        if (!user) {
            console.log('User not found with userId:', req.params.userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('User found:', user.username);
        res.json({ 
            username: user.username, 
            email: user.email,
            userId: user.userId 
        });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;