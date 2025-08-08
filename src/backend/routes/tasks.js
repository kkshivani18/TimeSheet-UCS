const express = require('express');
const router = express.Router();
const Task = require('../models/Tasks');
// const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

// create a new task (admin)
router.post('/admin/create', authMiddleware, async (req, res) => {
    try {
        const {
            userId,
            email,
            username,
            heading,
            description,
            deadline,
            date,
            completed = false,
            createdBy = "admin"
        } = req.body;

        if (!userId || !email || !username || !heading || !description || !deadline || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newTask = new Task({
            userId,
            email,
            username,
            heading: heading.trim(),
            description: description.trim(),
            deadline,
            date,
            completed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy
        });

        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// create a new task (user)
router.post('/user/create', authMiddleware, async (req, res) => {
    try {
        const {
            date,
            heading,
            description,
            deadline,
            completed = false
        } = req.body;

        if (!date || !heading || !description || !deadline) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const User = require('../models/User');
        const user = await User.findOne({userId: req.user.userId});
        if(!user){
            return res.status(404).json({ error: 'User not found' });
        }

        const taskDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if(taskDate < today){
            return res.status(400).json({ error: 'Cannot add tasks for past dates' });
        }

        const newTask = new Task({
            userId: user.userId,
            email: user.email,
            username: user.username,
            heading: heading.trim(),
            description: description.trim(),
            deadline,
            date,
            completed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: user.userId
        });

        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// router.post('/', async (req, res) => {
//     try {
//         const task = new Task(req.body);
//         const savedTask = await task.save();
//         res.status(201).json(savedTask);
//     } catch (err) {
//         res.status(400).json({ error: err.message });
//     }
// });

// get tasks for a user on a specific date
router.get('/user/:userId/date/:date', async (req, res) => {
    try {
        console.log('Auth user', req.user);
        console.log('Request params:', req.params);

        const { userId, date } = req.params;
        
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const tasks = await Task.find({
            userId,
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString()
            }
        }).sort({ createdAt: 1 });

        res.json(tasks);
    } catch (err) {
        console.error('route error:', err);
        res.status(500).json({ error: err.message });
    }
});

// get monthly tasks for a user
router.get('/user/:userId/monthly', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const tasks = await Task.find({
            userId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: 1 });

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// update a task
router.put('/:taskId', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            updateData,
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// delete a task
router.delete('/:taskId', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const deletedTask = await Task.findByIdAndDelete(taskId);

        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// toggle task completion
router.patch('/:taskId/toggle', async (req, res) => {
    try {
        const { taskId } = req.params;

        // fetch current task to get status
        const currentTask = await Task.findById(taskId);
        if (!currentTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // update with toggled status
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { 
                completed: !currentTask.completed,
                updatedAt: new Date().toISOString()
            },
            { new: true }
        );

        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;