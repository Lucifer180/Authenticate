const jwt = require("jsonwebtoken");

const requireGoogleJwt = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Application JWT required",
        });
    };

    const token = authorization.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            message: "Application JWT required",
        });
    };

    try {
        const decoded = jwt.verify(
            token,
            process.env.GOOGLE_APP_JWT_SECRET,
            {
                issuer: "authentication-lab",
                audience: "authentication-lab-api"
            }
        );

        if (decoded.authProvider !== "google" || !decoded.sub) {
            return res.status(401).json({
                message: "Invalid application JWT claims",
            });
        };
        req.auth = {
            userId: decoded.sub,
            authProvider: decoded.authProvider
        };
        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Application JWT expired",
            });
        }

        return res.status(401).json({
            message: "Invalid application JWT",
        });
    }
};

module.exports = {requireGoogleJwt}