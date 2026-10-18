const bcrypt = require("bcrypt");
const mongoose = require("mongoose")
const User = require("../models/User");
const logger = require("../logger/logger");
const crypto = require("crypto");
const { generateRefreshToken, hashRefreshToken } = require("../services/refreshTokenService");
const {
    sendPasswordResetEmail,
} = require("../services/emailService");
const { generateAccessToken } = require("../utils/tokenService");
const RefreshToken = require("../models/RefreshToken");
const { generateApiKey, hashApiKey } = require("../services/apiKeyServices");;
const ApiKey = require("../models/ApiKey");
const { baseCookieOptions, refreshCookieOptions } = require("../config/cookieOptions");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        logger.info({ userId: user._id.toString(), email: user.email }, "User registered");

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error(error, "Registration error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            logger.warn({ email }, "Login attempt missing email or password");

            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            logger.warn({ email }, "Login failed: user not found");

            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn({ userId: user._id.toString(), email: user.email }, "Login failed: invalid password");

            return res.status(401).json({
                message: "Invalid credentials",
            });
        }
        req.session.regenerate((error) => {
            if (error) {
                logger.info({ error }, "login session error")
                return res.status(500).json({
                    message: "something went wrong"
                })
            }



            req.session.userId = user._id.toString();
            req.session.sessionVersion = user.sessionVersion;

            logger.info({ userId: user._id.toString(), email: user.email }, "Login successful");
            return res.status(200).json({
                message: "Login successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        })

    } catch (error) {
        logger.error(error, "Login error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const getMe = async (req, res) => {
    return res.status(200).json({
        user: req.user,
    });
};

const logout = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            logger.error(error, "Logout error");

            return res.status(500).json({
                message: "Could not log out",
            });
        }

        res.clearCookie("connect.sid", baseCookieOptions);

        return res.status(200).json({
            message: "Logout successful",
        });
    });
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({
                message: "If an account exists with this email, a password reset link has been sent",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = resetPasswordExpires;

        await user.save();

        const resetUrl =
            `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        await sendPasswordResetEmail(
            user.email,
            resetUrl
        );
        return res.status(200).json({
            message: "If an account exists with this email, a password reset link has been sent",
            data: {
                resetPasswordExpires,
                resetPasswordToken: resetToken,
            },
        });
    } catch (error) {
        logger.error(error, "Forgot password error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                message: "Token and password are required"
            })
        };

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters",
            });
        };

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired reset token",
            });
        };

        const hashedPassword = await bcrypt.hash(password, 12);

        user.password = hashedPassword;

        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.sessionVersion += 1;
        await user.save();

        return res.status(200).json({
            message: "Password reset successfully"
        })
    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const jwtLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials",
            })
        };

        const accessToken = generateAccessToken(user);

        const refreshToken = generateRefreshToken();

        const refreshTokenHash = hashRefreshToken(refreshToken);

        await RefreshToken.create({
            tokenHash: refreshTokenHash,
            user: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        res.cookie("refreshToken", refreshToken, refreshCookieOptions)

        return res.status(200).json({
            message: "JWT login successful",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {

        logger.error({ error }, "error")
        return res.status(500).json({
            message: "Something went wrong",
        });

    }
};
const jwtProfile = (req, res) => {
    return res.status(200).json({
        message: "JWT authentication successful",
        user: req.user,
    });
};

const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token required",
            });
        };

        const tokenHash = hashRefreshToken(refreshToken);

        const storedToken = await RefreshToken.findOne({
            tokenHash
        });

        if (!storedToken) {
            return res.status(401).json({
                message: "Invalid refresh Token"
            })
        };

        if (storedToken.expiresAt <= new Date()) {
            await RefreshToken.deleteOne({
                _id: storedToken._id
            });

            return res.status(401).json({
                message: "Refresh token expired",
            })
        };

        const user = await User.findById(storedToken.user);

        if (!user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const newRefreshToken = generateRefreshToken();

        const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

        storedToken.tokenHash = newRefreshTokenHash;

        storedToken.expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        )

        await storedToken.save();

        // The browser gets the raw token; only its hash is stored.
        res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

        const accessToken = generateAccessToken(user);

        return res.status(200).json({
            accessToken,
        });

    } catch (error) {
        logger.error(error, "refreshToken error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const jwtLogout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const tokenHash = hashRefreshToken(refreshToken)
            await RefreshToken.deleteOne({ tokenHash });
        };
        res.clearCookie("refreshToken", baseCookieOptions);
        return res.status(200).json({
            message: "JWT logout successful",
        });
    } catch (error) {
        logger.error(error, "jwt logout error");
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const createApiKey = async (req, res) => {
    try {
        const { name, permissions, expiresAt } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "API ke y name is required",
            });
        };

        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);

        const newApiKey = await ApiKey.create({
            name,
            keyHash,
            owner: req.user._id,
            permissions: permissions || [],
            expiresAt: expiresAt || null,
        });

        res.status(201).json({
            message: "API key created successfully",

            apiKey,

            key: {
                id: newApiKey._id,
                name: newApiKey.name,
                permissions: newApiKey.permissions,
                expiresAt: newApiKey.expiresAt,
            },
        })
    } catch (error) {
        logger.error(error, "create api key error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
}

const changeRole = async (req, res) => {
    try {
        const targetUserId = req.body?.userId || req.params?.id || req.user._id;
        const newRole = req.body?.role || "admin";

        if (!["user", "admin"].includes(newRole)) {
            return res.status(400).json({
                message: "Invalid role. Role must be 'user' or 'admin'",
            });
        }

        const user = await User.findById(targetUserId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        user.role = newRole;
        await user.save();

        logger.info(
            { userId: user._id.toString(), newRole: user.role, updatedBy: req.user._id.toString() },
            "User role updated successfully"
        );

        return res.status(200).json({
            message: `User role updated to ${user.role} successfully`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error(error, "Change role error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const revokeApiKey = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid API key ID",
            });
        }

        const apiKey = await ApiKey.findOne({
            _id: id,
            owner: req.user._id,
            revoked: false,
        });

        if (!apiKey) {
            return res.status(404).json({
                message: "API key not found",
            });
        };

        apiKey.revoked = true;
        await apiKey.save();

        return res.status(200).json({
            message: "API key revoked Successfully"
        });
    } catch (error) {
        logger.error(error, "Revoke api key error", error);

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const listApiKeys = async (req, res) => {
    try {
        const apiKeys = await ApiKey.find({
            owner: req.user._id
        }).select("-keyHash").sort({ createdAt: -1 });

        return res.status(200).json({
            count: apiKeys.length,
            apiKeys
        })
    } catch (error) {
        logger.error(error, "List API keys error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

const rotateApiKey = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid API key ID",
            });
        };

        const apiKey = await ApiKey.findOne({
            _id: id,
            owner: req.user._id,
            revoked: false
        });

        if (!apiKey) {
            return res.status(404).json({
                message: "Active API key not found",
            });
        };

        const newApiKey = generateApiKey();
        const newKeyHash = hashApiKey(newApiKey);

        const replacement = await ApiKey.create({
            name: apiKey.name,
            keyHash: newKeyHash,
            owner: apiKey.owner,
            permissions: apiKey.permissions,
            expiresAt: apiKey.expiresAt
        });

        apiKey.revoked = true;
        await apiKey.save();


        return res.status(201).json({
            message: "API key rotated successfully",
            apiKey: newApiKey,
            key: {
                id: replacement._id,
                name: replacement.name,
                permissions: replacement.permissions,
                expiresAt: replacement.expiresAt,
            },
        });

    } catch (error) {
        logger.error(error, "Rotate API key error");

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
}

module.exports = {
    register,
    login,
    getMe,
    logout,
    forgotPassword,
    resetPassword,
    jwtLogin,
    jwtProfile,
    refreshAccessToken,
    jwtLogout,
    createApiKey,
    changeRole,
    revokeApiKey,
    listApiKeys,
    rotateApiKey
};
