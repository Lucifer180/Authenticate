const express = require("express");

const router = express.Router();
const { requireApiKey } = require("../middleware/apiKeyMiddleware")
const {
  createApiKey, revokeApiKey,
  listApiKeys, rotateApiKey
} = require("../controllers/authController");

const {
  requireAuthJWT,
} = require("../middleware/jwtMiddleware");

const {
  requiredRole,
} = require("../middleware/roleMiddleware");

router.post(
  "/",
  requireAuthJWT,
  requiredRole("admin"),
  createApiKey
);

router.get(
  "/profile",
  requireApiKey,
  (req, res) => {
    return res.status(200).json({
      message: "API key authentication successful",
      apiKey: {
        id: req.apiKey._id,
        name: req.apiKey.name,
        owner: req.apiKey.owner,
        permissions: req.apiKey.permissions,
      },
    });
  }
);
router.patch(
  "/:id/revoke",
  requireAuthJWT,
  revokeApiKey
);

router.get("/", requireAuthJWT, listApiKeys);

router.post("/:id/rotate", requireAuthJWT, rotateApiKey)

module.exports = router;