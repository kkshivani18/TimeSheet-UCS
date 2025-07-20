const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    checkInTime: { type: String, required: false }, 
    checkOutTime: { type: String, required: false }, 
    date: { type: String, required: true }, 
    holidayName: { type: String, default: null },
    isHoliday: { type: Boolean, default: false },
    isWeekend: { type: Boolean, default: false },
    regularization_date: { type: String, default: null },
    regularization_requested: { type: Boolean, default: false },
    regularization_status: { type: String, default: null },
    totalWorkedMinutes: { type: Number, default: 0 },
    workedHours: { type: Number, default: 0 }
}, { timestamps: true, collection: 'attendance' });

module.exports = mongoose.model('Attendance', AttendanceSchema);