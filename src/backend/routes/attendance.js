const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// create or update attendance for a user on date
router.post('/', async (req, res) => {
    console.log('Received attendance POST:', req.body);
    try {
        const { userId, date } = req.body;
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

// Get attendance for a user within a date range
router.get('/user/:userId/range', async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        
        const records = await Attendance.find({
            userId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: 1 });
        
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// get pending reg reqs
router.get('/regularization/pending', async (req, res) => {
    try {
        const pendingRequests = await Attendance.find({
            regularization_requested: true,
            regularization_status: 'Pending'
        }).populate('userId', 'username email');
        
        res.json(pendingRequests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// update reg req status
router.put('/regularization/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, checkInTime, checkOutTime, workedHours, totalWorkedMinutes } = req.body;
        
        const updateData = {
            regularization_status: status
        };

        if (status === 'Approved') {
            updateData.checkInTime = checkInTime;
            updateData.checkOutTime = checkOutTime;
            updateData.workedHours = workedHours;
            updateData.totalWorkedMinutes = totalWorkedMinutes;
        }
        
        const updatedRecord = await Attendance.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        
        res.json(updatedRecord);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;