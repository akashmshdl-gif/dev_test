const API_KEY = process.env.API_KEY || 'your-secure-api-key';

module.exports = function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  // if (!apiKey || apiKey !== API_KEY) {
  //   return res.status(403).json({ error: 'Forbidden: Invalid or missing API key' });
  // }

  next();
};
