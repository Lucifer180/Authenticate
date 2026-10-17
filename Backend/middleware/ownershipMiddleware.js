const requireOwnership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required",
        });
    };

    const requestedUserId = req.params.id;

    if (req.user.role === "admin") {
        return next();
    }
    if (req.user._id.toString() !== requestedUserId) {
        return res.status(403).json({
            message: "You can only access your own resource",
        });
    };
    next();
}

module.exports = {
    requireOwnership
}