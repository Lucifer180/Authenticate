const permissions = {
    user: [
        "profile:read",
        "profile:update",
    ],
    manager: [
        "profile:read",
        "profile:update",
        "orders:read",
        "orders:update",
    ],
    admin: [
        "profile:read",
        "profile:update",
        "orders:read",
        "orders:update",
        "users:read",
        "users:update",
        "users:delete",
    ],
};

const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }
        const userPermissions = permissions[req.user.role] || [];

        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                message: "Permission denied",
            });
        }
        next();
    }
};

module.exports = {
    requirePermission
}