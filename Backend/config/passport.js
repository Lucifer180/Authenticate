const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { profile } = require("console");

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const emaiVerified = profile._json?.email_verified === true;

            if (!email || !emaiVerified) {
                return done(null, false, {
                    message: " A verified Google email is required"
                });
            };

            let user = await User.findOne({ googleId });

            if (user) {
                return done(null, user);
            };

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return done(null, false, {
                    message: "An account with this email already exists. Sign in using the account first",
                })
            };

            const randomPassword = crypto.randomBytes(32).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPassword, 12);

            user = await User.create({
                name: profile.displayName || email.split("@")[0],
                email,
                password: hashedPassword,
                googleId,
                role: "user"
            });
            return done(null, user);

        } catch (error) {
            return done(error);
        }
    }),

);

module.exports = passport;