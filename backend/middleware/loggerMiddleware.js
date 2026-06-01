const logger = require("../utils/logger");

const loggerMiddleware = (req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);

  const originalSend = res.send;
  res.send = function (data) {
    logger.info(`Response Sent: Status ${res.statusCode}`);
    logger.info(`Response Body: ${data}`);
    originalSend.call(this, data);
  };

  next();
};

module.exports = loggerMiddleware;
