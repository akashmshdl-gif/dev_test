const express = require('express');
const router = express.Router();
const {
  getJwksEndpoint,
  getProviderJwksEndpoint,
  getPatientJwksEndpoint,
} = require('../controllers/jwksController');

/**
 * @swagger
 * /.well-known/jwks.json:
 *   get:
 *     summary: Retrieve JSON Web Key Set (JWKS)
 *     description: Public endpoint to retrieve the public keys used to verify JWTs issued by this application.
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: A JSON Web Key Set (JWKS)
 *       500:
 *         description: Failed to load JWKS
 */
router.get('/.well-known/jwks.json', getJwksEndpoint);

/**
 * @swagger
 * /provider/.well-known/jwks.json:
 *   get:
 *     summary: Retrieve provider JSON Web Key Set (JWKS)
 *     description: Public endpoint used for the provider-facing Epic SMART app JWKS.
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Provider JSON Web Key Set (JWKS)
 *       500:
 *         description: Failed to load provider JWKS
 */
router.get('/provider/.well-known/jwks.json', getProviderJwksEndpoint);

/**
 * @swagger
 * /patient/.well-known/jwks.json:
 *   get:
 *     summary: Retrieve patient JSON Web Key Set (JWKS)
 *     description: Public endpoint used for the patient-facing Epic SMART app JWKS.
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Patient JSON Web Key Set (JWKS)
 *       500:
 *         description: Failed to load patient JWKS
 */
router.get('/patient/.well-known/jwks.json', getPatientJwksEndpoint);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check Endpoint
 *     description: Public endpoint to verify that the server is running.
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
