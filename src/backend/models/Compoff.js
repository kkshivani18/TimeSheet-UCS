const mongoose = require("mongoose");

const CompOffSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    startDateTime: {
        type: String,
        required: true
    },
    endDateTime: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'OnHold'],
        default: 'Pending'
    },
    compOffType: {
        type: String,
        enum: ['full', 'half'],
        default: 'full'
    },
    halfDayPeriod: {
        type: String,
        enum: ['morning', 'afternoon'],
        default: null
    },
}, {timestamps: true, collection: 'compOff'});

module.exports = mongoose.model('Compoff', CompOffSchema);