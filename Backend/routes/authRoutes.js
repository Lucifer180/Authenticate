const express = require("express");

const { register, login, getMe, jwtLogout, jwtLogin, logout, forgotPassword, refreshAccessToken, resetPassword, jwtProfile, changeRole } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAuthJWT } = require("../middleware/jwtMiddleware")
const router = express.Router();
const {
    requiredRole,
} = require("../middleware/roleMiddleware");
const {
    requireOwnership,
} = require("../middleware/ownershipMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware")
router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/jwt/login", jwtLogin);
router.get("/jwtProfile", requireAuthJWT, jwtProfile);
router.post(
    "/jwt/refresh",
    refreshAccessToken
);
router.post(
    "/jwt/logout",
    jwtLogout
);

// Role change endpoints (Requires logged in user via Session or JWT)
router.patch("/role", requireAuth, changeRole);
router.put("/role", requireAuth, changeRole);
router.patch("/change-role", requireAuth, changeRole);
router.put("/change-role", requireAuth, changeRole);
router.patch("/make-admin", requireAuth, changeRole);
router.put("/make-admin", requireAuth, changeRole);
router.patch("/users/:id/role", requireAuth, changeRole);
router.put("/users/:id/role", requireAuth, changeRole);

router.get(
    "/admin-only",
    requireAuthJWT,
    requiredRole("admin"),
    (req, res) => {
        return res.status(200).json({
            message: "Welcome Admin",
            user: req.user,
        });
    }
);

router.get(
    "/admin-user",
    requireAuthJWT,
    requirePermission("users:delete"),
    (req, res) => {
        return res.status(200).json({
            message: "Welcome Admin",
            user: req.user,
        });
    }
);

router.get(
    "/users/:id",
    requireAuthJWT,
    requireOwnership,
    (req, res) => {
        return res.status(200).json({
            message: "You can access this user's resource",
            user: req.user,
        });
    }
);

module.exports = router;
