const express = require('express');
const router = express.Router();
const cdsController = require('../controllers/cdsController');
const epicController = require('../controllers/epicController');

/**
 * @swagger
 * /cds-hooks/cds-service:
 *   get:
 *     summary: CDS Hooks Discovery Endpoint
 *     description: Returns the list of CDS services provided by this application.
 *     tags: [CDS Hooks]
 *     responses:
 *       200:
 *         description: Successfully returned CDS services discovery document.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 */
// Discovery Endpoint
router.get('/', cdsController.getDiscoveryInfo);

/**
 * @swagger
 * /cds-hooks/cds-service/patient-view:
 *   post:
 *     summary: Patient View Hook
 *     description: Invoked when a user opens a patient's chart.
 *     tags: [CDS Hooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: CDS Cards returned successfully.
 */
// Hooks Endpoints
router.post('/patient-view', cdsController.handlePatientView);

/**
 * @swagger
 * /cds-hooks/cds-service/observation-view:
 *   post:
 *     summary: Observation View Hook
 *     description: Invoked when a user views observation/results.
 *     tags: [CDS Hooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: CDS Cards returned successfully.
 */
router.post('/observation-view', cdsController.handleObservationView);

/**
 * @swagger
 * /cds-hooks/cds-service/order-select:
 *   post:
 *     summary: Order Select Hook
 *     description: Invoked when a user selects an order (e.g., medication).
 *     tags: [CDS Hooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: CDS Cards returned successfully.
 */
router.post('/order-select', cdsController.handleRxView);

/**
 * @swagger
 * /cds-hooks/cds-service/rx-sign:
 *   post:
 *     summary: Rx Sign Hook
 *     description: Invoked when a user signs a prescription/order.
 *     tags: [CDS Hooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: CDS Cards returned successfully.
 */
router.post('/rx-sign', cdsController.handleRxSign);

/**
 * @swagger
 * /cds-hooks/cds-service/pama-imaging:
 *   post:
 *     summary: PAMA Imaging Hook
 *     description: Invoked for PAMA imaging appropriateness criteria.
 *     tags: [CDS Hooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: CDS Cards returned successfully.
 */
router.post('/pama-imaging', cdsController.handlePamaImaging);

/**
 * @swagger
 * /cds-hooks/cds-service/c-trials:
 *   get:
 *     summary: Retrieve one patient's CDS prefetch data directly from Epic
 *     description: >
 *       Fetches the patient-view prefetch payload for a single patient using the
 *       backend Epic credential flow used by `/api/GetAllPatientList`.
 *       This endpoint does not save anything to the database.
 *       If `clinicId` is omitted, the server falls back to its configured backend Epic client id.
 *     tags: [CDS Hooks]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: FHIR patient id to fetch from Epic.
 *       - in: query
 *         name: clinicId
 *         required: false
 *         schema:
 *           type: string
 *         description: Credential lookup id used by the backend Epic auth flow.
 *     responses:
 *       200:
 *         description: Prefetch data returned successfully.
 *       400:
 *         description: patientId or clinicId missing.
 *       500:
 *         description: Internal server error.
 */
router.get('/c-trials', epicController.getPatientPrefetchData);

module.exports = router;
