require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const authRoutes = require("./routes/authRoutes");
const connectDb = require("./config/db");
const logger = require("./logger/logger");
const cookieParser = require("cookie-parser");
const apiKeyRoutes = require("./routes/apiKeyRoutes");
const externalRoutes = require("./routes/externalRoutes");
const { baseCookieOptions } = require("./config/cookieOptions");
const app = express();

// Render (like most hosts) terminates HTTPS at a proxy. Trusting it lets
// express-session see the request as secure and actually send Secure cookies.
app.set("trust proxy", 1);

// Comma-separated list of allowed frontend origins (scheme + host, no path),
// e.g. "https://lucifer180.github.io,http://localhost:5173".
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
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

app.use(session({
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
}));

app.use("/api/auth", authRoutes);
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
    await connectDb();

    app.listen(PORT, () => {
        logger.info(`server is running on port ${PORT}`);
    });
};

startServer();
