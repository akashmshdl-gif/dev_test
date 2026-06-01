const express = require('express');
const router = express.Router();
const { providerLogin, providerCallback } = require('../controllers/providerAuthController');

/**
 * @swagger
 * tags:
 *   name: Provider Authentication
 *   description: Epic SMART on FHIR provider login (OAuth2 + PKCE)
 */

/**
 * @swagger
 * /api/auth/provider-login:
 *   get:
 *     summary: Get Epic provider authorization URL
 *     description: |
 *       Returns an Epic OAuth2 authorize URL that the client should open in a
 *       new browser tab. No query parameters or request body required.
 *     tags: [Provider Authentication]
 *     security: []
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize?response_type=code&client_id=...
 *       500:
 *         description: Server error or missing configuration
 */
router.get('/provider-login', providerLogin);

/**
 * @swagger
 * /api/auth/provider-callback:
 *   get:
 *     summary: Epic OAuth2 callback (exchanges auth code and redirects to the frontend)
 *     description: |
 *       Epic redirects here after the provider authenticates. Exchanges the
 *       authorization code for an access token, fetches the Practitioner
 *       resource, and redirects to the frontend dashboard with query params.
 *     tags: [Provider Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The authorization code returned by Epic
 *     responses:
 *       302:
 *         description: Redirects to the frontend dashboard with the callback payload
 *       400:
 *         description: Missing authorization code
 *       500:
 *         description: Token exchange failed
 */
router.get('/provider-callback', providerCallback);

module.exports = router;
