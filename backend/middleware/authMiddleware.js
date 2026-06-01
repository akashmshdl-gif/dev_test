const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const publicPaths = new Set([
    '/getPatientDataById',
    '/GetPatientFullData'
  ]);

  if (publicPaths.has(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.JWT_SECRET_KEY || 'default_jwt_secret_key';

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};
