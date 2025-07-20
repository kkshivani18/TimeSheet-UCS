const express = require('express');
const router = express.Router();
const CompOff = require('../models/Compoff');

// new CompOff request
router.post('/', async (req, res) => {
    try {
        const compOff = new CompOff(req.body);
        const saved = await compOff.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all CompOff requests for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const compOffs = await CompOff.find({ userId: req.params.userId });
        res.json(compOffs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all CompOff requests (admin)
router.get('/', async (req, res) => {
    try {
        const compOffs = await CompOff.find();
        res.json(compOffs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;