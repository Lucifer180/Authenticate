const User = require("../models/User");
const { verifyAccessToken } = require("../utils/tokenService");;

const requireAuthJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Authorization header required",
            });
        };

        const [scheme, token] = authHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({
                message: "Invalid authorization format",
            });
        };

        const decoded = verifyAccessToken(token);

        const user = await User.findById(decoded.userId)
        if (!user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("JWT authentication error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};

module.exports = {
    requireAuthJWT
}
