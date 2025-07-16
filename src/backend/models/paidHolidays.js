const mongoose = require('mongoose');

const PaidHolidaySchema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    year: { type: Number, required: true }
}, {timestamps: true});

module.exports = mongoose.model('PaidHoliday', PaidHolidaySchema);
