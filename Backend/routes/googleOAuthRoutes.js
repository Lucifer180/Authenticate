const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const {
    requireGoogleSession,
} = require("../middleware/googleSessionMiddleware");
const { OAuth2Client } = require("google-auth-library");
const { findOrCreateGoogleUser } = require("../src/services/googleService")
const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);
const jwt = require("jsonwebtoken");
const { requireGoogleJwt } = require("../middleware/googleMiddleware");

router.get("/google", (req, res) => {
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie("google_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 5 * 60 * 1000,
    });

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        response_type: "code",
        scope: "openid email profile",
        state,
    });

    return res.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
});


router.get("/google/callback", async (req, res) => {
    const { code, state, error } = req.query;
    const savedState = req.cookies?.google_oauth_state;

    if (error) {
        return res.status(400).json({
            message: "Google authorization was not completed",
            error,
        });
    };

    if (!code) {
        return res.status(400).json({
            message: "Invalid Oauth state"
        })
    };

    if (!state || !savedState || state !== savedState) {
        return res.status(400).json({
            message: "invalid Oauth state",
        })
    };

    res.clearCookie("google_oauth_state");

    try {
        const params = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_CALLBACK_URL,
            grant_type: "authorization_code",
        });

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error("Google token exchange failed:", tokens.error);

            return res.status(401).json({
                message: "Failed to exchange authorization code",
            });
        }

        if (!tokens.id_token) {
            return res.status(401).json({
                message: "google Id token is missing"
            })
        };

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });


        const payload = ticket.getPayload();


        if (!payload || payload.email_verified !== true) {
            return res.status(401).json({
                message: "Google email is not verified",
            });
        }
        const { user } = await findOrCreateGoogleUser(payload);

        req.session.regenerate((error) => {
            if (error) {
                console.error("Session regeneration error:", error.message);

                return res.status(500).json({
                    message: "Failed to establish login session",
                });
            }

            req.session.googleUserId = user._id.toString();

            req.session.save((saveError) => {
                if (saveError) {
                    console.error("Google session save error:", saveError.message);

                    return res.status(500).json({
                        message: "Failed to establish login session",
                    });
                }

                return res.redirect("http://localhost:5173/google-dashboard");
            });
        });
        // return res.status(created ? 201 : 200).json({
        //     message: created
        //         ? "Google user created successfully"
        //         : "Returning Google user recognized",
        //     created,
        //     user: {
        //         id: user._id,
        //         googleId: user.googleId,
        //         email: user.email,
        //         name: user.name,
        //         emailVerified: user.emailVerified,
        //     },
        // });
        // // return res.status(200).json({
        // //     message: "Google ID token verified successfully",
        // //     identity: {
        // //         googleId: payload.sub,
        // //         email: payload.email,
        // //         name: payload.name,
        // //         emailVerified: payload.email_verified,
        // //     },
        // // });
    } catch (error) {
        console.error("Google token exchange error:", error.message);
        return res.status(500).json({
            message: "Google token exchange failed",
        });
    }
});

router.get("/google/me", requireGoogleSession, (req, res) => {
    return res.status(200).json({
        message: "Google session authenticated",
        user: {
            id: req.googleUser._id,
            googleId: req.googleUser.googleId,
            email: req.googleUser.email,
            name: req.googleUser.name,
        },
    });
});

router.post("/google/logout", requireGoogleSession, (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Failed to log out"
            })
        };

        res.clearCookie("connect.sid");

        return res.status(200).json({
            message: "Google session logout successfully"
        })
    })
});

router.get("/google/jwt/callback", async (req, res) => {
    const { code, state, error } = req.query;
    const savedState = req.cookies?.google_oauth_jwt_sign
    if (error) {
        return res.status(400).json({
            message: "Google authorization was not completed"
        });
    };


    if (!code || !state || !savedState || state !== savedState) {
        return res.status(400).json({
            message: "Invalid OAuth state",
        });
    }
    res.clearCookie("google_oauth_jwt_sign");

    try {
        const params = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: "http://localhost:5000/api/auth/google/jwt/callback",
            grant_type: "authorization_code",
        });

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok || !tokens.id_token) {
            return res.status(401).json({
                message: "Google token exchange failed",
            });
        };

        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || payload.email_verified !== true || !payload.sub) {
            return res.status(401).json({
                message: "Google identity verification failed",
            });
        };

        const { user } = await findOrCreateGoogleUser(payload);

        const appToken = jwt.sign({
            sub: user._id.toString(),
            authProvider: "google"
        },
            process.env.GOOGLE_APP_JWT_SECRET,
            {
                expiresIn: process.env.GOOGLE_APP_JWT_EXPIRES_IN || "15m",
                issuer: "authentication-lab",
                audience: "authentication-lab-api"
            }
        );
        return res.status(200).json({
            message: "Google login successfull; application JWT issued",
            tokenType: "Bearer",
            expiresIn: process.env.GOOGLE_APP_JWT_EXPIRES_IN || "15m",
            accessToken: appToken,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name
            }
        })
    } catch (error) {
        console.error("Google JWT callback failed:", error.message);

        return res.status(500).json({
            message: "Google JWT authentication failed",
        });
    }
});

router.get("/google/jwt", (req, res) => {
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie("google_oauth_jwt_sign", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 5 * 60 * 1000
    });

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: "http://localhost:5000/api/auth/google/jwt/callback",
        response_type: "code",
        scope: "openid email profile",
        state
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/google/jwt/me", requireGoogleJwt, (req, res) => {
    return res.status(200).json({
        message: "Application JWT authenticated",
        user: {
            id: req.auth.userId,
            authProvider: req.auth.authProvider,
        },
    });
});

module.exports = router;