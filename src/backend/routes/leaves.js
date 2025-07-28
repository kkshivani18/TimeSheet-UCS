const express = require('express');
const router = express.Router();
const Leave = require('../models/Leaves');

// Create a new leave request
router.post('/', async (req, res) => {
    try {
      const leave = new Leave(req.body);
      await leave.save();
      res.status(201).json(leave);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

// get all leave reqs
router.get('/', async (req, res) => {
  try {
    const { userId, year, month } = req.query;
    if (!userId || !year || !month) {
      return res.status(400).json({ error: 'userId, year, and month are required' });
    }

    // approved leaves of the user
    const monthStr = month.toString().padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;

    const leaves = await Leave.find({
      userId,
      status: 'Approved',
      // Leave overlaps with the month
      $or: [
        {
          startDate: { $lte: monthEnd },
          endDate: { $gte: monthStart }
        }
      ]
    });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all leave requests for a user
router.get('/user/:userId', async(req, res) => {
  try {
    const { userId } = req.params;
    const leaves = await Leave.find({ 
      userId,
      status: 'Approved'
    }, ).sort({ createdAt: -1 });
    
    res.json(leaves);
  } catch (err) {
    res.status(500).json({error: err.message });
  }
})

module.exports = router;