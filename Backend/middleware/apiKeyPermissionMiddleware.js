const requireApiKeyPermission = (permission) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                message: "API key authentication required",
            });
        };

        if (!req.apiKey.permissions.includes(permission)) {
            return res.status(403).json({
                message: "API key permission denied",
            });
        }
        next();
    }
};

module.exports = { requireApiKeyPermission };