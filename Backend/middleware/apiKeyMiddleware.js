const logger = require("../logger/logger");
const ApiKey = require("../models/ApiKey");

const { hashApiKey } = require("../services/apiKeyServices");

const requireApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey) {
            return res.status(401).json({
                message: "API key required",
            });
        };

        const keyHash = hashApiKey(apiKey);

        const storedKey = await ApiKey.findOne({
            keyHash, revoked: false
        });

        if (!storedKey) {
            return res.status(401).json({
                message: "Invalid API key",
            });
        };

        if (storedKey.expiresAt && storedKey.expiresAt <= new Date()) {
            return res.status(401).json({
                message: "API key expired",
            })
        };

        req.apiKey = storedKey;

        next();
    } catch (error) {
        logger.error(error,
            "API key authentication error:",

        );

        return res.status(500).json({
            message: "Something went wrong",
        });

    }
};

module.exports = {requireApiKey}