const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ where: { username, isActive: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const secretKey = process.env.JWT_SECRET_KEY || 'default_jwt_secret_key';
    const token = jwt.sign(
      { id: user.id, username: user.username },
      secretKey,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack // Temporary: sending stack trace to help debug the deployed instance
    });
  }
};

module.exports = { login };
