const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// Create or update attendance for a user on a date
router.post('/', async (req, res) => {
    console.log('Received attendance POST:', req.body);
    try {
        const { userId, date } = req.body;
        // Upsert: update if exists, else create
        const attendance = await Attendance.findOneAndUpdate(
            { userId, date },
            req.body,
            { new: true, upsert: true }
        );
        res.status(200).json(attendance);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all attendance records for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const records = await Attendance.find({ userId: req.params.userId });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get attendance for a user on a specific date
router.get('/user/:userId/date/:date', async (req, res) => {
    try {
        const record = await Attendance.findOne({ userId: req.params.userId, date: req.params.date });
        if(!record) {
            return res.json(null);
        }
        res.json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;