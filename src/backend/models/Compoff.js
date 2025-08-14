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

CompOffSchema.pre('save', function (next) {
    if (!this.createdAt) {
        this.createdAt = new Date();
    }
    this.updatedAt = new Date();
    next();
});

CompOffSchema.pre('findOneAndUpdate', function (next) {
    this.set({ updatedAt: new Date() });
    // never allow overriding createdAt
    if (this._update.createdAt) {
        delete this._update.createdAt;
    }
    next();
});

module.exports = mongoose.model('Compoff', CompOffSchema);