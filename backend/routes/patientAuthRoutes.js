const express = require("express");
const router = express.Router();
const { patientLogin, patientCallback } = require("../controllers/patientAuthController");

/**
 * @swagger
 * tags:
 *   name: Patient Authentication
 *   description: Epic SMART on FHIR patient login (OAuth2 + PKCE + private_key_jwt)
 */

/**
 * @swagger
 * /api/auth/patient-login:
 *   get:
 *     summary: Get Epic patient authorization URL
 *     description: |
 *       Returns an Epic OAuth2 authorize URL for the patient-facing SMART on FHIR
 *       flow. Open the returned URL in a browser to continue the login.
 *     tags: [Patient Authentication]
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
 *                 state:
 *                   type: string
 *       500:
 *         description: Server error or missing configuration
 */
router.get("/patient-login", patientLogin);

/**
 * @swagger
 * /api/auth/patient-callback:
 *   get:
 *     summary: Epic patient OAuth2 callback
 *     description: |
 *       Epic redirects here after the patient authenticates. Exchanges the
 *       authorization code for an access token, fetches the Patient resource,
 *       and redirects to the frontend dashboard with query params.
 *     tags: [Patient Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The authorization code returned by Epic
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: PKCE state generated during patient login
 *     responses:
 *       302:
 *         description: Redirects to the frontend dashboard with the callback payload
 *       400:
 *         description: Missing authorization code, state, or PKCE verifier
 *       500:
 *         description: Token exchange failed
 */
router.get("/patient-callback", patientCallback);

module.exports = router;
