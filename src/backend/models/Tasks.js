const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    heading: { type: String, required: true },
    description: { type: String, required: true },
    deadline: { type: String, required: true },
    date: { type: String, required: true, index: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, default: null },
    createdBy: { type: String, default: null }
}, { timestamps: true, collection: 'tasks', _id: true });

module.exports = mongoose.model('Tasks', TaskSchema);