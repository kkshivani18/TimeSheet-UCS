
const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, 
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin'] },
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    googleId: {type: String, sparse: true, unique: true},
    authProvider: {type: String, enum: ['local', 'google'], default: 'local'}
}, {timestamps: true, collection: 'users'});

module.exports = mongoose.model('User', UserSchema)