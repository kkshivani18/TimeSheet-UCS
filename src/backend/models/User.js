
const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, 
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'user' },
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {timestamps: true});

module.exports = mongoose.model('User', UserSchema)