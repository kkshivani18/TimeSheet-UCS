const express = require('express');
const router = express.Router();
const Task = require('../models/Tasks');
const mongoose = require('mongoose');

// Create a new task
router.post('/', async (req, res) => {
    try {
        const task = new Task(req.body);
        const savedTask = await task.save();
        res.status(201).json(savedTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get tasks for a user on a specific date
router.get('/user/:userId/date/:date', async (req, res) => {
    try {
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
        res.status(500).json({ error: err.message });
    }
});

// Get monthly tasks for a user
router.get('/user/:userId/monthly', async (req, res) => {
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

// Update a task
router.put('/:taskId', async (req, res) => {
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

// Delete a task
router.delete('/:taskId', async (req, res) => {
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

// Toggle task completion
router.patch('/:taskId/toggle', async (req, res) => {
    try {
        const { taskId } = req.params;

        // Find current task to get status
        const currentTask = await Task.findById(taskId);
        if (!currentTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Update with toggled status
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