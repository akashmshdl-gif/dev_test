const express = require('express');
const router = express.Router();
const epicPatientRoutes = require('./epicPatientRoutes');
const authRoutes = require('./authRoutes');
const jwksRoutes = require('./jwksRoutes');

// Public routes (No auth required)
router.use('/', jwksRoutes);

// Auth routes
router.use('/auth', authRoutes);

// Epic routes
router.use('/', epicPatientRoutes);

module.exports = router;
