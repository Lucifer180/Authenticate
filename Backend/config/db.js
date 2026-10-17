const mongoose = require("mongoose");
const logger = require("../logger/logger");

const connectDb = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        logger.error("MONGO_URI is missing in .env");
        process.exit(1);
    }

    if (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://")) {
        logger.error("MONGO_URI must start with mongodb:// or mongodb+srv://");
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        logger.info("MongoDB connected");
    } catch (error) {
        if (error.code === 8000 || error.codeName === "AtlasError") {
            logger.error(
                "MongoDB authentication failed. Check the Atlas database username/password in MONGO_URI and URL-encode any special characters in the password."
            );
        } else if (
            error.message?.includes("ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR") ||
            error.cause?.code === "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" ||
            error.name === "MongooseServerSelectionError"
        ) {
            logger.error(
                "MongoDB connection failed: Could not establish a secure connection to MongoDB Atlas. Ensure your current IP address is whitelisted in MongoDB Atlas under 'Network Access' (https://cloud.mongodb.com)."
            );
        }

        logger.error(error, "MongoDB connection failed");
        process.exit(1);
    }
};

module.exports = connectDb;
