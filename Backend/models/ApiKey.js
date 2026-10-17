const mongoose = require("mongoose");

const ApiKeySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    keyHash: {
        type: String,
        required: true,
        unique: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    permissions: {
        type: [String],
        default: [],
    },

    expiresAt: {
        type: Date,
        default: null,
    },

    revoked: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const ApiKey = mongoose.model("ApiKey",ApiKeySchema);

module.exports=  ApiKey