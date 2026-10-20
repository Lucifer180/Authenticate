const GoogleUser = require("../models/GoogleUser");

const requireGoogleSession = async (req, res, next) => {
    try {
        const googleUserId = req.session.googleUserId;

        if (!googleUserId) {
            return res.status(401).json({
                message: "Googe login required"
            });
        };

        const user = await GoogleUser.findById(googleUserId);

        if (!user) {
            return res.status(401).json({
                message: "Google user not found",
            });
        }

        req.googleUser = user;

        next();
    } catch (error) {
        console.error("Google session error:", error.message);

        return res.status(500).json({
            message: "Something went wrong",
        });

    }
};

module.exports = {requireGoogleSession};