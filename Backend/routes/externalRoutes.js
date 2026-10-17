const express = require("express");
const router = express.Router();

const {
    requireApiKey,
} = require("../middleware/apiKeyMiddleware");

const {
    requireApiKeyPermission,
} = require("../middleware/apiKeyPermissionMiddleware");


router.get("/profile", requireApiKey, requireApiKeyPermission("profile:read"), (req, res) => {
    return res.status(200).json({
        message: "API key permission granted",
        apiKey: {
            id: req.apiKey._id,
            name: req.apiKey.name,
            permissions: req.apiKey.permissions,
        },
    })
});

module.exports = router;