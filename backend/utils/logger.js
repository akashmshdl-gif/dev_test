const fs = require('node:fs');
const path = require('node:path');
const { createLogger, format, transports } = require('winston');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const logTransports = [new transports.Console()];

if (!isServerless) {
  const logDir = path.resolve(process.cwd(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  logTransports.push(
    new transports.File({ filename: path.join(logDir, 'app.log') })
  );
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: logTransports,
});

module.exports = logger;
