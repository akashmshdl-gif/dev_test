const { v4: uuidv4 } = require('uuid');
const { CdsRequest, Patient, PatientObservation } = require('../models');
const { getClinicalTrialMatches } = require('../services/clinicalTrialMatchService');

function getPatientNameFromPrefetch(patient) {
  if (!patient || typeof patient !== 'object') {
    return null;
  }

  const names = Array.isArray(patient.name) ? patient.name : [];
  const selectedName =
    names.find((name) => name && typeof name === 'object' && name.use === 'official') ||
    names.find((name) => name && typeof name === 'object' && name.use === 'usual') ||
    names[0];

  if (!selectedName || typeof selectedName !== 'object') {
    return null;
  }

  if (typeof selectedName.text === 'string' && selectedName.text.trim()) {
    return selectedName.text.trim();
  }

  const givenNames = Array.isArray(selectedName.given)
    ? selectedName.given.filter((part) => typeof part === 'string' && part.trim())
    : [];
  const familyNames = Array.isArray(selectedName.family)
    ? selectedName.family.filter((part) => typeof part === 'string' && part.trim())
    : typeof selectedName.family === 'string' && selectedName.family.trim()
      ? [selectedName.family.trim()]
      : [];
  const fullName = [...givenNames, ...familyNames].join(' ').trim();

  return fullName || null;
}

function getSmartAppLaunchUrl() {
  const frontendAppUrl = process.env.SMART_APP_LAUNCH_URL || process.env.FRONTEND_APP_URL || 'http://localhost:5173'

  return new URL('/', frontendAppUrl).toString()
}

function buildClinicalTrialsSmartLink(patientId, patientName) {
  if (!patientId) {
    return null
  }

  return {
    label: 'Open SMART on FHIR app',
    url: getSmartAppLaunchUrl(),
    type: 'smart',
    appContext: JSON.stringify({
      source: 'cds-hooks',
      feature: 'clinical-trial-matching',
      patientId,
      patientName,
    }),
  }
}

async function getPatientDisplayName(patientId, prefetchPatient) {
  if (patientId) {
    const patientRecord = await Patient.findOne({
      where: { fhir_id: patientId },
      attributes: ['full_name', 'first_name', 'last_name'],
    });

    if (patientRecord) {
      const fullName =
        typeof patientRecord.full_name === 'string' ? patientRecord.full_name.trim() : '';
      const firstName =
        typeof patientRecord.first_name === 'string' ? patientRecord.first_name.trim() : '';
      const lastName =
        typeof patientRecord.last_name === 'string' ? patientRecord.last_name.trim() : '';
      const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();

      if (fullName) {
        return fullName;
      }

      if (combinedName) {
        return combinedName;
      }
    }
  }

  return getPatientNameFromPrefetch(prefetchPatient) || patientId || 'Unknown';
}

function getMedicationNameFromResource(resource, fallbackLabel) {
  if (!resource || typeof resource !== 'object') {
    return fallbackLabel || 'Medication'
  }

  const medicationReferenceDisplay =
    typeof resource.medicationReference?.display === 'string'
      ? resource.medicationReference.display.trim()
      : ''

  if (medicationReferenceDisplay) {
    return medicationReferenceDisplay
  }

  const medicationCodeableConceptText =
    typeof resource.medicationCodeableConcept?.text === 'string'
      ? resource.medicationCodeableConcept.text.trim()
      : ''

  if (medicationCodeableConceptText) {
    return medicationCodeableConceptText
  }

  const medicationCodeableConceptDisplay = Array.isArray(resource.medicationCodeableConcept?.coding)
    ? resource.medicationCodeableConcept.coding.find(
        (coding) => coding && typeof coding.display === 'string' && coding.display.trim(),
      )?.display
    : ''

  if (typeof medicationCodeableConceptDisplay === 'string' && medicationCodeableConceptDisplay.trim()) {
    return medicationCodeableConceptDisplay.trim()
  }

  return fallbackLabel || 'Medication'
}

function getDummyMedicationPrice(medicationName, index) {
  const basePrice = 19.99 + index * 8.5
  const priceBump = medicationName.length % 7

  return (basePrice + priceBump).toFixed(2)
}

function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = Number.parseFloat(String(value))

  return Number.isFinite(numericValue) ? numericValue : null
}

function getObservationLabel(observation) {
  return (
    observation.test_name ||
    observation.loinc_display ||
    observation.local_display ||
    observation.order_name ||
    'Observation'
  )
}

function getObservationTimestamp(observation) {
  return (
    observation.issued_date_time ||
    observation.effective_date_time ||
    observation.updatedAt ||
    observation.createdAt ||
    null
  )
}

function toDateValue(value) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const dateValue = new Date(value)

  return Number.isNaN(dateValue.getTime()) ? null : dateValue
}

function getObservationSeverity(observation) {
  const interpretationCode = String(observation.interpretation_code || '').trim().toUpperCase()
  const interpretationDisplay = String(observation.interpretation_display || '').trim().toLowerCase()
  const numericValue = parseNumericValue(observation.value)
  const referenceRangeLow = parseNumericValue(observation.reference_range_low)
  const referenceRangeHigh = parseNumericValue(observation.reference_range_high)

  const criticalCodes = new Set(['HH', 'LL', 'AA', 'CRIT', 'CRITICAL'])
  const warningCodes = new Set(['H', 'L', 'A', 'ABN', 'ABNORMAL'])

  if (
    criticalCodes.has(interpretationCode) ||
    interpretationDisplay.includes('critical') ||
    interpretationDisplay.includes('panic')
  ) {
    return 'critical'
  }

  if (
    warningCodes.has(interpretationCode) ||
    interpretationDisplay.includes('high') ||
    interpretationDisplay.includes('low') ||
    interpretationDisplay.includes('abnormal')
  ) {
    return 'warning'
  }

  if (numericValue !== null) {
    if (referenceRangeLow !== null && numericValue < referenceRangeLow) {
      return 'warning'
    }

    if (referenceRangeHigh !== null && numericValue > referenceRangeHigh) {
      return 'warning'
    }
  }

  return 'info'
}

function getObservationSummary(observation, indicator) {
  const label = getObservationLabel(observation)

  if (indicator === 'critical') {
    return `${label} critical result`
  }

  if (indicator === 'warning') {
    return `${label} outside reference range`
  }

  return `${label} reviewed`
}

function getObservationDetail(observation, patientName, indicator) {
  const label = getObservationLabel(observation)
  const value = String(observation.value || '').trim()
  const unit = String(observation.unit || '').trim()
  const valueText = value ? `${value}${unit ? ` ${unit}` : ''}` : 'not available'
  const referenceRangeLow = String(observation.reference_range_low || '').trim()
  const referenceRangeHigh = String(observation.reference_range_high || '').trim()
  const rangeUnit = String(
    observation.reference_range_high_unit || observation.reference_range_low_unit || observation.unit || '',
  ).trim()
  const referenceRangeText =
    referenceRangeLow || referenceRangeHigh
      ? ` Reference range: ${referenceRangeLow || '?'} - ${referenceRangeHigh || '?'}${rangeUnit ? ` ${rangeUnit}` : ''}.`
      : observation.reference_range_text
        ? ` Reference range: ${String(observation.reference_range_text).trim()}.`
        : ''
  const interpretationText = String(observation.interpretation_display || '').trim()
  const dateValue = toDateValue(getObservationTimestamp(observation))
  const dateText =
    dateValue
      ? ` Collected on ${dateValue.toISOString().slice(0, 10)}.`
      : ''

  if (indicator === 'critical') {
    return `${patientName}'s ${label} result is ${valueText}.${referenceRangeText}${interpretationText ? ` Interpretation: ${interpretationText}.` : ''}${dateText}`.trim()
  }

  if (indicator === 'warning') {
    return `${patientName}'s ${label} result is ${valueText} and should be reviewed.${referenceRangeText}${interpretationText ? ` Interpretation: ${interpretationText}.` : ''}${dateText}`.trim()
  }

  return `${patientName}'s ${label} result is ${valueText}.${referenceRangeText}${dateText}`.trim()
}

function buildPatientViewInfoCard(patientId, patientName) {
  const smartLink = buildClinicalTrialsSmartLink(patientId, patientName)

  return {
    uuid: uuidv4(),
    summary: 'Clinical Trial Matches Available',
    indicator: 'info',
    source: { label: 'Ulalo Clinical Trials' },
    detail: `Review real-time clinical trial matches and eligibility insights for ${patientName} inside the SMART on FHIR app.`,
    links: smartLink ? [smartLink] : [],
  }
}

function buildCriticalObservationCard(observation, patientName) {
  const label = getObservationLabel(observation)
  const value = String(observation.value || '').trim()
  const unit = String(observation.unit || '').trim()
  const valueText = value ? `${value}${unit ? ` ${unit}` : ''}` : 'not available'
  const dateValue = toDateValue(getObservationTimestamp(observation))
  const dateText = dateValue ? ` Collected on ${dateValue.toISOString().slice(0, 10)}.` : ''

  return {
    uuid: uuidv4(),
    summary: `${label} critical review`,
    indicator: 'critical',
    source: { label: 'Patient Observation Service' },
    detail: `${patientName}'s ${label} result is ${valueText}.${dateText}`.trim()
  }
}

function selectObservationCards(observations, patientName) {
  const orderedObservations = [...observations].sort((left, right) => {
    const leftTime = toDateValue(getObservationTimestamp(left))
    const rightTime = toDateValue(getObservationTimestamp(right))
    const leftValue = leftTime ? leftTime.getTime() : 0
    const rightValue = rightTime ? rightTime.getTime() : 0

    return rightValue - leftValue
  })
  const latestObservation = orderedObservations[0]

  return latestObservation ? [buildCriticalObservationCard(latestObservation, patientName)] : []
}

// GET /cds-hooks/cds-service
const getDiscoveryInfo = (req, res) => {
  res.json({
    services: [
      {
        hook: "patient-view",
        id: "patient-view",
        title: "Patient View Service",
        description: "Handles the Patient View hook",
        prefetch: {
          patient: "Patient/{{context.patientId}}"
        }
      },
      {
        hook: "order-select",
        id: "rx-view",
        title: "Rx View Service",
        description: "Handles the Rx View (order-select) hook",
        prefetch: {
          patient: "Patient/{{context.patientId}}",
          medications: "MedicationRequest?patient={{context.patientId}}"
        }
      },
      {
        hook: "observation-view",
        id: "observation-view",
        title: "Observation View Service",
        description: "Handles the latest patient observation review hook",
        prefetch: {
          patient: "Patient/{{context.patientId}}"
        }
      },
      {
        hook: "order-sign",
        id: "rx-sign",
        title: "Rx Sign Service",
        description: "Handles the Rx Sign (order-sign) hook",
        prefetch: {
          patient: "Patient/{{context.patientId}}"
        }
      },
      {
        hook: "order-select", // PAMA imaging often uses order-select or order-sign
        id: "pama-imaging",
        title: "PAMA Imaging Service",
        description: "Handles PAMA Imaging appropriate use criteria",
        prefetch: {
          patient: "Patient/{{context.patientId}}"
        }
      }
    ]
  });
};

// POST /cds-hooks/cds-service/patient-view
const handlePatientView = async (req, res) => {
  const { context, prefetch } = req.body;
  const patient = prefetch?.patient;
  const patientId = context?.patientId || patient?.id || null;
  let patientName = patientId || 'Unknown';
  let cards = [];

  try {
    patientName = await getPatientDisplayName(patientId, patient);
    await CdsRequest.create({ hook_name: 'patient-view', request_body: req.body });

    // Base info card
    cards.push(buildPatientViewInfoCard(patientId, patientName));

    // Clinical trial cards come from the Ulalo API unless mock mode is enabled explicitly.
    const useMock = process.env.USE_MOCK_TRIAL_DATA === 'true';
    const { cards: trialCards } = await getClinicalTrialMatches(prefetch, useMock, patientId);

    if (trialCards?.length) {
      cards.push(...trialCards);
    }
  } catch (err) {
    console.error('[handlePatientView]', err.message || err);
    // Always return at least the info card
    if (cards.length === 0) {
      cards.push(buildPatientViewInfoCard(patientId, patientName));
    }
  }

  res.json({ cards });
};

// POST /cds-hooks/cds-service/observation-view
const handleObservationView = async (req, res) => {
  const { context, prefetch } = req.body;
  const patient = prefetch?.patient;
  const patientId = context?.patientId || patient?.id || null;
  let patientName = patientId || 'Unknown';
  let cards = [];

  try {
    patientName = await getPatientDisplayName(patientId, patient);
    await CdsRequest.create({ hook_name: 'observation-view', request_body: req.body });
    const observations = patientId
      ? await PatientObservation.findAll({
          where: { patient_id: patientId, isActive: true },
          attributes: [
            'test_name',
            'loinc_display',
            'local_display',
            'order_name',
            'value',
            'unit',
            'interpretation_code',
            'interpretation_display',
            'reference_range_low',
            'reference_range_low_unit',
            'reference_range_high',
            'reference_range_high_unit',
            'reference_range_text',
            'issued_date_time',
            'effective_date_time',
            'updatedAt',
            'createdAt',
          ],
          raw: true,
        })
      : []

    cards = selectObservationCards(observations, patientName)
  } catch (err) { console.error(err); }

  res.json({ cards });
};

// POST /cds-hooks/cds-service/order-select
const handleRxView = async (req, res) => {
  const { context } = req.body;
  
  try {
    await CdsRequest.create({ hook_name: 'order-select', request_body: req.body });
  } catch (err) { console.error(err); }

  const draftOrderEntries = Array.isArray(context?.draftOrders?.entry)
    ? context.draftOrders.entry
    : []
  const selections = Array.isArray(context?.selections) ? context.selections : []
  const cards = draftOrderEntries.map((entry, i) => {
    const resource = entry && typeof entry === 'object' ? entry.resource : null
    const fallbackSelection = typeof selections[i] === 'string' ? selections[i] : ''
    const medicationName = getMedicationNameFromResource(resource, fallbackSelection)
    const price = getDummyMedicationPrice(medicationName, i)

    return {
      uuid: uuidv4(),
      summary: 'Medication Request Review',
      indicator: 'warning',
      detail: `${medicationName} estimated price: $${price}`,
      source: { label: 'AI Engine' }
    }
  })

  if (cards.length === 0) {
    cards.push({
      uuid: uuidv4(),
      summary: 'Medication Request Review',
      indicator: 'warning',
      detail: 'Demo medication estimated price: $24.99',
      source: { label: 'AI Engine' }
    })
  }

  res.json({ cards });
};

// POST /cds-hooks/cds-service/rx-sign
const handleRxSign = async (req, res) => {
  const { context } = req.body;

  try {
    await CdsRequest.create({ hook_name: 'rx-sign', request_body: req.body });
  } catch (err) { console.error(err); }

  res.json({
    cards: [{
      uuid: uuidv4(),
      summary: `Rx Sign - Final Review`,
      indicator: "warning",
      detail: `AI Engine: Checking for PGx alerts and drug interactions before signature...`,
      source: { label: "AI Engine" }
    }]
  });
};

// POST /cds-hooks/cds-service/pama-imaging
const handlePamaImaging = async (req, res) => {
  const { context } = req.body;

  try {
    await CdsRequest.create({ hook_name: 'pama-imaging', request_body: req.body });
  } catch (err) { console.error(err); }

  res.json({
    cards: [{
      uuid: uuidv4(),
      summary: `PAMA Imaging AUC Check`,
      indicator: "info",
      detail: `AI Engine: Analyzing imaging order for Appropriate Use Criteria (AUC) compliance.`,
      source: { label: "AI Engine" }
    }]
  });
};

module.exports = {
  getDiscoveryInfo,
  handlePatientView,
  handleObservationView,
  handleRxView,
  handleRxSign,
  handlePamaImaging
};
