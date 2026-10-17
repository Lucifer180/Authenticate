const User = require("../models/User");
const logger = require("../logger/logger");
const { verifyAccessToken } = require("../utils/tokenService");

const requireAuth = async (req, res, next) => {
    try {
        // 1. Session authentication check
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId).select("-password");

            if (!user) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            if (req.session.sessionVersion !== user.sessionVersion) {
                req.session.destroy(() => { });

                return res.status(401).json({
                    message: "Session expired. Please log in again.",
                });
            }

            req.user = user;
            return next();
        }

        // 2. JWT authentication check
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const [scheme, token] = authHeader.split(" ");
            if (scheme === "Bearer" && token) {
                try {
                    const decoded = verifyAccessToken(token);
                    const user = await User.findById(decoded.userId).select("-password");
                    if (user) {
                        req.user = user;
                        return next();
                    }
                } catch (error) {
                    // Invalid or expired token
                }
            }
        }

        return res.status(401).json({
            message: "Authentication required"
        });
    } catch (error) {
        logger.error(error, "Authentication error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

module.exports = {
    requireAuth
};