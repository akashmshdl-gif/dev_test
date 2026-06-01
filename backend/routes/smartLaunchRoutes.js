const express = require("express");
const router = express.Router();
const {
  smartLaunch,
  smartCallback,
} = require("../controllers/smartLaunchController");

/**
 * @swagger
 * tags:
 *   name: SMART EHR Launch
 *   description: SMART on FHIR EHR launch flow (used by EHR simulators and Epic)
 */

/**
 * @swagger
 * /api/auth/smart-launch:
 *   post:
 *     summary: Initiate SMART EHR launch
 *     description: |
 *       Receives the `iss` (FHIR server URL) and `launch` context from the
 *       EHR, discovers the FHIR server's authorization endpoints, generates
 *       PKCE, and returns an authorization URL for the frontend to redirect to.
 *     tags: [SMART EHR Launch]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iss
 *               - launch
 *             properties:
 *               iss:
 *                 type: string
 *                 description: The FHIR server base URL provided by the EHR
 *                 example: https://launch.smarthealthit.org/v/r4/fhir
 *               launch:
 *                 type: string
 *                 description: The opaque launch context token from the EHR
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *                   description: The full authorization URL to redirect the user to
 *                 state:
 *                   type: string
 *       400:
 *         description: Missing iss or launch parameters
 *       500:
 *         description: Failed to discover SMART endpoints or server error
 */
router.post("/smart-launch", smartLaunch);

/**
 * @swagger
 * /api/auth/smart-callback:
 *   get:
 *     summary: SMART EHR launch OAuth callback
 *     description: |
 *       The authorization server redirects here after the user approves access.
 *       Exchanges the authorization code for tokens, fetches the patient
 *       resource, and redirects to the frontend dashboard.
 *     tags: [SMART EHR Launch]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The authorization code returned by the auth server
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: The state parameter to match against the stored session
 *     responses:
 *       302:
 *         description: Redirects to the frontend dashboard with session data
 *       400:
 *         description: Missing code/state or invalid/expired state
 *       500:
 *         description: Token exchange failed
 */
router.get("/smart-callback", smartCallback);

module.exports = router;
