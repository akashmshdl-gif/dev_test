const express = require("express");
const router = express.Router();
const {
  getAllPatientList,
  getPatientDataById
} = require("../controllers/epicController");

/**
 * @swagger
 * /api/GetAllPatientList:
 *   get:
 *     summary: Retrieve patient IDs and start background Epic sync
 *     description: >
 *       This endpoint quickly returns the patient IDs from the Epic FHIR system
 *       and starts the detailed fetch/save processing in the background.
 *       It requires **clinicId** (query).
 *       - clinicId → used to fetch Epic credentials and token
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clinicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the clinic making the request.
 *     responses:
 *       202:
 *         description: Patient IDs returned and background processing started.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                 orgId:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 patientCount:
 *                   type: integer
 *                 patientIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: clinicId or OrgId missing.
 *       500:
 *         description: Internal server error.
 */
router.get("/GetAllPatientList", getAllPatientList);

/**
 * @swagger
 * /api/getPatientDataById:
 *   get:
 *     summary: Retrieve all stored data for a patient
 *     description: >
 *       Returns the patient row and all related rows from the patient-linked tables
 *       using the provided **patientId** (`patients.fhir_id`).
 *       Any BYTEA fields are converted to UTF-8 text in the API response.
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: FHIR patient id from the `patients.fhir_id` column.
 *     responses:
 *       200:
 *         description: Patient data returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 200
 *                     message:
 *                       type: string
 *                       example: Success
 *                 patientId:
 *                   type: string
 *                   example: eVJnQ0xvE7f
 *                 data:
 *                   type: object
 *                   properties:
 *                     patient:
 *                       type: object
 *                     conditions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     observations:
 *                       type: array
 *                       items:
 *                         type: object
 *                     medications:
 *                       type: array
 *                       items:
 *                         type: object
 *                     document_references:
 *                       type: array
 *                       items:
 *                         type: object
 *                     document_reference_content:
 *                       type: array
 *                       items:
 *                         type: object
 *                     patient_document_refrence_entries:
 *                       type: array
 *                       items:
 *                         type: object
 *                     patient_discharge_summary:
 *                       type: array
 *                       items:
 *                         type: object
 *                     observation_imaging:
 *                       type: array
 *                       items:
 *                         type: object
 *                     document_reference_imaging_result:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: patientId is missing.
 *       404:
 *         description: Patient not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/getPatientDataById", getPatientDataById);
router.get("/GetPatientFullData", getPatientDataById);

module.exports = router;
