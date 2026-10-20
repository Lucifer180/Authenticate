const mongoose = require("mongoose");

const googleSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        default: ""
    },
    emailVerified: {
        type: Boolean,
        required: true
    }
}, 
{ timestamps: true });

module.exports = mongoose.model("GoogleUser", googleSchema);

