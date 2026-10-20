require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const googleOAuthRoutes = require("./routes/googleOAuthRoutes");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const externalRoutes = require("./routes/externalRoutes");

const connectDb = require("./config/db");
const logger = require("./logger/logger");
const { baseCookieOptions } = require("./config/cookieOptions");
const passport = require("./config/passport");

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = (
    process.env.FRONTEND_ORIGIN || "http://localhost:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use(
    session({
        name: "connect.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
        }),
        cookie: {
            ...baseCookieOptions,
            maxAge: 1000 * 60 * 60 * 24,
        },
    })
);

app.use("/api/auth", authRoutes);
app.use("/api/auth", googleOAuthRoutes);
app.use("/api/api-keys", apiKeyRoutes);
app.use("/api/external", externalRoutes);

app.use((error, req, res, next) => {
    logger.error(error, "Unhandled request error");

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        message: "Something went wrong",
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDb();

        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(error, "Server startup failed");
        process.exit(1);
    }
};

startServer();