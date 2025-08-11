const express = require('express');
const router = express.Router();
const Leave = require('../models/Leaves');
// const authMiddleware = require('../middleware/auth');
// const adminMiddleware = require('./admin');

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

    const monthStr = month.toString().padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;

    const leaves = await Leave.find({
      userId,
      status: 'Approved',
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

// get leave requests for a user for their calendar attendance 
router.get('/user/:userId', async(req, res) => {
  try {
    const { userId } = req.params;
    const leaves = await Leave.find({userId: userId, status: 'Approved'}).sort({ createdAt: -1 });
    
    res.json(leaves);
  } catch (err) {
    res.status(500).json({error: err.message });
  }
})

// get user leaves for admin view
router.get('/users/:userId/leaves', async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;
        
        if (!year || !month) {
            return res.status(400).json({ error: 'year and month are required' });
        }

        const monthStr = month.toString().padStart(2, '0');
        const monthStart = new Date(`${year}-${monthStr}-01`);
        const monthEnd = new Date(year, month, 0);

        const leaves = await Leave.find({
            userId,
            status: 'Approved',
            $or: [
                {
                    startDate: { $lte: monthEnd.toISOString().split('T')[0] },
                    endDate: { $gte: monthStart.toISOString().split('T')[0] }
                }
            ]
        });

        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// getting all leaves for a userId
router.get('/user/all/:userId/', async(req, res) => {
  try {
    const { userId } = req.params;
    const leaves = await Leave.find({userId: userId}).sort({ createdAt: -1 });
    
    res.json(leaves);
  } catch (err) {
    res.status(500).json({error: err.message });
  }
})

// get all leave reqs
router.get('/all', async (req, res) => {
    try {
      const leaves = await Leave.find({}).sort({ createdAt: -1 });
      res.json(leaves);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

// update leave status 
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }
        
        // prevent modification of already approved requests
        if (leave.status.toLowerCase() === 'approved' && status.toLowerCase() !== 'approved') {
            return res.status(400).json({ success: false, message: 'Approved requests cannot be modified' });
        }
        
        leave.status = status;
        leave.updatedAt = new Date();
        await leave.save();
        
        res.json({ success: true, message: `Leave request ${status}`, data: leave });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// delete leave request 
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ success: false, message: 'Leave request not found' });
        }
        
        await Leave.findByIdAndDelete(id);
        res.json({ success: true, message: 'Leave request deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;