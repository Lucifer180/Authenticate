const crypto = require("crypto");

const generateApiKey = () => {
    return `ak_${crypto.randomBytes(32).toString("hex")}`;
};

const hashApiKey = (apiKey) => {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
};

module.exports = {
    generateApiKey, hashApiKey
}