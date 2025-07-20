const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    numberOfDays: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, required: true },
    userEmail: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String, required: true }
}, {timestamps: true, collection: 'leaves'});

module.exports = mongoose.model('Leaves', leaveSchema);