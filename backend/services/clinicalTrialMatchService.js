const { fetchUlaloTrialMatchCards } = require('./ulaloTrialMatchService');

const MOCK_TRIAL_CARDS = [
  {
    uuid: "NCT06643819",
    summary: "Eligible for trial: Essential Hypertension (NCT06643819)",
    detail:
      "The patient is a 76-year-old male with essential hypertension, which is the target condition of the trial. He meets the age requirement of 19 years or older. There is no indication in the summary of a history of secondary hypertension, orthostatic hypotension, or type 1 diabetes. There is no documented use of antihypertensive medications or any indication of recent clinical trial drug usage, drug/alcohol abuse, or pregnancy. Therefore, he does not meet any exclusion criteria and is suitable for enrollment. | matches: Age 76 meets inclusion age requirement; Has essential hypertension",
    indicator: "info",
    source: {
      label: "Mock Community Clinic",
      url: "https://clinicaltrials.gov/study/NCT06643819",
    },
    suggestions: [
      {
        label:
          "Refer patient to Phase 3 Trial to Evaluate the Efficacy and Safety of CKD-202A",
        uuid: "refer-NCT06643819",
        actions: [
          {
            type: "create",
            description:
              "Create a referral (ServiceRequest) to trial NCT06643819",
            resource: {
              resourceType: "ServiceRequest",
              status: "draft",
              intent: "proposal",
              subject: { reference: "Patient/unknown" },
              authoredOn: new Date().toISOString(),
              extension: [
                {
                  url: "https://kroniq.srdc.com.tr/fhir/StructureDefinition/context",
                  valueReference: { reference: "EpisodeOfCare/" },
                },
              ],
              code: {
                coding: [
                  {
                    system: "https://clinicaltrials.gov",
                    code: "NCT06643819",
                    display:
                      "Phase 3 Trial to Evaluate the Efficacy and Safety of CKD-202A",
                  },
                ],
                text: "Phase 3 Trial to Evaluate the Efficacy and Safety of CKD-202A",
              },
              reasonCode: [
                {
                  text: "The patient is a 76-year-old male with essential hypertension, which is the target condition of the trial. He meets the age requirement of 19 years or older. | matches: Age 76 meets inclusion age requirement; Has essential hypertension",
                },
              ],
              performer: [{ display: "Mock Community Clinic" }],
            },
          },
        ],
      },
    ],
  },
  {
    uuid: "NCT06073665",
    summary: "Possible trial match: Hypothyroidism (NCT06073665)",
    detail:
      "Patient is male and aged 76, meeting demographic criteria. He has a diagnosis of hypothyroidism which has been active since 2008, satisfying the inclusion criteria for this condition. However, the patient does not have any documented medication, and it is unclear if he meets the requirement of taking 75-200 mcg/per day of LT4 without dose adjustment. | matches: Male and aged 76; Diagnosed with hypothyroidism | concerns: No documentation of LT4 dosage; Uncertainty in compliance and understanding study requirements",
    indicator: "info",
    source: {
      label: "Mock University Medical Center",
      url: "https://clinicaltrials.gov/study/NCT06073665",
    },
    suggestions: [
      {
        label: "Refer patient to Dosing of LT4 in Older Individuals",
        uuid: "refer-NCT06073665",
        actions: [
          {
            type: "create",
            description:
              "Create a referral (ServiceRequest) to trial NCT06073665",
            resource: {
              resourceType: "ServiceRequest",
              status: "draft",
              intent: "proposal",
              subject: { reference: "Patient/unknown" },
              authoredOn: new Date().toISOString(),
              extension: [
                {
                  url: "https://kroniq.srdc.com.tr/fhir/StructureDefinition/context",
                  valueReference: { reference: "EpisodeOfCare/" },
                },
              ],
              code: {
                coding: [
                  {
                    system: "https://clinicaltrials.gov",
                    code: "NCT06073665",
                    display: "Dosing of LT4 in Older Individuals",
                  },
                ],
                text: "Dosing of LT4 in Older Individuals",
              },
              reasonCode: [
                {
                  text: "Patient is male and aged 76, meeting demographic criteria. Diagnosed with hypothyroidism. | matches: Male and aged 76; Diagnosed with hypothyroidism | concerns: No documentation of LT4 dosage",
                },
              ],
              performer: [{ display: "Mock University Medical Center" }],
            },
          },
        ],
      },
    ],
  },
];

/**
 * Stamps the patient id into mock card ServiceRequest subjects.
 */
function personaliseMockCards(cards, patientId) {
  if (!patientId) return cards;

  return cards.map((card) => ({
    ...card,
    suggestions: (card.suggestions || []).map((s) => ({
      ...s,
      actions: (s.actions || []).map((a) => {
        if (a.resource?.subject?.reference) {
          return {
            ...a,
            resource: {
              ...a.resource,
              subject: { reference: `Patient/${patientId}` },
            },
          };
        }
        return a;
      }),
    })),
  }));
}

/**
 * Returns clinical trial CDS cards.
 *
 * @param {object|null} prefetch  – Raw CDS prefetch (patient, conditions, labs, etc.)
 * @param {boolean}     useMock   – true → return mock cards, false → call Ulalo API
 * @param {string|null} patientId – Epic FHIR patient id extracted from the CDS request
 * @returns {Promise<{ cards: object[] }>}
 */
async function getClinicalTrialMatches(prefetch, useMock, patientId = null) {
  const resolvedPatientId = patientId || prefetch?.patient?.id || null;

  // ── Mock mode ──────────────────────────────────────────────────────────
  if (useMock) {
    const cards = personaliseMockCards(MOCK_TRIAL_CARDS, resolvedPatientId);
    return { cards };
  }

  const cards = await fetchUlaloTrialMatchCards(resolvedPatientId);

  return { cards };
}

module.exports = { getClinicalTrialMatches };
