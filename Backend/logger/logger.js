const pino = require("pino");

const logger = pino({
    level:"debug" || "info",
    base:{
        service:"my-node-app"
    },
    timestamp:pino.stdTimeFunctions.isoTime
});

module.exports = logger