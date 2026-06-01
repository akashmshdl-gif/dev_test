const axios = require("axios");

function fhirR4Path(fhirBaseUrl, resource, query) {
  const b = String(fhirBaseUrl || "").trim().replace(/\/+$/, "");
  const q = query
    ? query.startsWith("?")
      ? query
      : `?${query}`
    : "";
  return `${b}/R4/${resource}${q}`;
}

/**
 * @param {object} listSearchBundle - FHIR Bundle (searchset) from List?code=patients search
 * @returns {string[]} unique patient logical ids
 */
function extractPatientIdsFromListSearchBundle(listSearchBundle) {
  const ids = new Set();
  for (const top of listSearchBundle?.entry || []) {
    const list = top?.resource;
    if (list?.resourceType !== "List") continue;
    for (const row of list?.entry || []) {
      const ref = row?.item?.reference;
      if (typeof ref !== "string" || !ref.startsWith("Patient/")) continue;
      const id = ref.slice("Patient/".length);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function envResource(name, fallback) {
  const v = process.env[name];
  if (v && String(v).trim()) return String(v).trim();
  return fallback;
}

/**
 * Merges Patient + Observation + Condition + MedicationRequest (search) into one FHIR collection Bundle.
 * Uses EPIC_PATIENT_SEARCH, EPIC_OBSERVATION, EPIC_CONDITION_SEARCH, EPIC_MEDICATION_REQUEST from .env
 */
async function fetchPatientDetailCollectionBundle(
  fhirBaseUrl,
  accessToken,
  patientLogicalId
) {
  const patType = envResource("EPIC_PATIENT_SEARCH", "Patient");
  const obsType = envResource("EPIC_OBSERVATION", "Observation");
  const condType = envResource("EPIC_CONDITION_SEARCH", "Condition");
  const medReqType = envResource("EPIC_MEDICATION_REQUEST", "MedicationRequest");

  const count = envResource("EPIC_FHIR_PAGE_SIZE", "100");
  const patientParam = encodeURIComponent(patientLogicalId);
  const q = (extra) => `${extra}&_count=${encodeURIComponent(count)}`;

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/fhir+json, application/json"
  };

  const patientUrl = fhirR4Path(
    fhirBaseUrl,
    `${patType}/${encodeURIComponent(patientLogicalId)}`
  );
  const obsUrl = fhirR4Path(
    fhirBaseUrl,
    obsType,
    q(`patient=${patientParam}`)
  );
  const condUrl = fhirR4Path(
    fhirBaseUrl,
    condType,
    q(`patient=${patientParam}`)
  );
  const medUrl = fhirR4Path(
    fhirBaseUrl,
    medReqType,
    q(`patient=${patientParam}`)
  );

  const results = {
    errors: {}
  };

  const getJson = async (key, url) => {
    try {
      const res = await axios.get(url, { headers: authHeaders, validateStatus: () => true });
      if (res.status >= 400) {
        results.errors[key] =
          typeof res.data === "object" ? res.data : { message: String(res.data) };
        return null;
      }
      return res.data;
    } catch (e) {
      results.errors[key] = e.response?.data || e.message;
      return null;
    }
  };

  const [patient, obsData, condData, medData] = await Promise.all([
    getJson("patient", patientUrl),
    getJson("observation", obsUrl),
    getJson("condition", condUrl),
    getJson("medicationRequest", medUrl)
  ]);

  const entry = [];
  if (patient && patient.resourceType === "Patient") {
    entry.push({
      fullUrl: patientUrl,
      resource: patient
    });
  } else if (!results.errors.patient) {
    results.errors.patient = { message: "Patient read returned no Patient resource" };
  }

  const addSearchBundleEntries = (bundle) => {
    if (!bundle || bundle.resourceType !== "Bundle") return;
    for (const e of bundle.entry || []) {
      if (e?.resource) entry.push(e);
    }
  };
  addSearchBundleEntries(obsData);
  addSearchBundleEntries(condData);
  addSearchBundleEntries(medData);

  return {
    resourceType: "Bundle",
    type: "collection",
    entry,
    _fetchErrors: Object.keys(results.errors).length ? results.errors : undefined
  };
}

/**
 * @returns {Promise<Array<{ patientId: string, fhirCollectionBundle: object }>>}
 */
async function buildPatientDetailsFromList(
  fhirBaseUrl,
  accessToken,
  listSearchBundle
) {
  const patientIds = extractPatientIdsFromListSearchBundle(listSearchBundle);
  const out = await Promise.all(
    patientIds.map(async (patientId) => {
      const fhirCollectionBundle = await fetchPatientDetailCollectionBundle(
        fhirBaseUrl,
        accessToken,
        patientId
      );
      return { patientId, fhirCollectionBundle };
    })
  );
  return out;
}

const buildQueryParams = (obj) => {
  const keyMap = { PatientId: "identifier" };
  return Object.entries(obj || {})
    .filter(([_, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    })
    .map(([key, value]) => {
      const mappedKey = keyMap[key] || key;
      return `${encodeURIComponent(mappedKey)}=${encodeURIComponent(value)}`;
    })
    .join("&");
};

// ✅ CONFIG OUTSIDE LOOP
const getResourceConfig = (env, baseUrls) => ({
  // ✅ DEMOGRAPHICS
  basic_patient_data: {
    requiresPatient: true,
    buildUrl: ({ patientId }) => {
      const type = env("EPIC_PATIENT_SEARCH", "Patient");
      // Patient.Read
      return `${baseUrls.r4}/${type}/${encodeURIComponent(patientId)}`;
    }
  },

  // ✅ ICD CONDITIONS
  condition_data: {
    requiresPatient: true,
    buildUrl: ({ patientId, pageSize }) => {
      const type = env("EPIC_CONDITION_SEARCH", "Condition");
      return `${baseUrls.r4}/${type}?patient=${patientId}&category=problem-list-item&_count=${pageSize}`;
    }
  },

  // ✅ LAB RESULTS (LOINC)
  labs_data: {
    requiresPatient: true,
    buildUrl: ({ patientId, pageSize }) => {
      const type = env("EPIC_OBSERVATION", "Observation");
      return `${baseUrls.r4}/${type}?patient=${patientId}&category=laboratory&_count=${pageSize}`;
    }
  },

  // ✅ MEDICATION REQUEST (ORDERS)
  medication_request: {
    requiresPatient: true,
    buildUrl: ({ patientId, pageSize }) => {
      const type = env("EPIC_MEDICATION_REQUEST", "MedicationRequest");
      return `${baseUrls.r4}/${type}?patient=${patientId}&status=active&_count=${pageSize}`;
    }
  },

  // ✅ DOCUMENT REFERENCE
  document_reference: {
    requiresPatient: true,
    buildUrl: ({ patientId }) => {
      return `${baseUrls.stu3}/DocumentReference?class=clinical-note&patient=${patientId}`;
    }
  },

  // ✅ OBSERVATION DICOM / IMAGING
  observation_dicom_search: {
    requiresPatient: true,
    buildUrl: ({ patientId, pageSize }) => {
      const type = env("OBSERVATION_DICOM_SEARCH", "Observation");
      return `${baseUrls.r4}/${type}?patient=${patientId}&category=imaging&_count=${pageSize}`;
    }
  },

  // ✅ DOCUMENT REFERENCE – IMAGING RESULT
  document_reference_imaging_result: {
    requiresPatient: true,
    buildUrl: ({ patientId }) => {
      const category = env("IMAGING_RESULT", "imaging-result");
      return `${baseUrls.r4}/DocumentReference?patient=${patientId}&category=${category}`;
    }
  },

  // ✅ MEDICATION MASTER DATA
  // medication_data: {
  //   requiresPatient: true,
  //   buildUrl: ({ patientId, pageSize }) => {
  //     const type = env("EPIC_MEDICATION", "Medication");
  //     return `${baseUrls.r4}/${type}?subject=${patientId}&_count=${pageSize}`;
  //   }
  // }
});

async function buildEpicResourceDataBundle(config) {
  const {
    fhir_base_url_r4,
    fhir_base_url_stu3,
    fhir_base_url_dstu2,
    headers,
    resources,
    search_criteria = {}
  } = config;

  const patientFhirId = config.patientFhirId
    ? String(config.patientFhirId).trim() || null
    : null;

  const pageSize = process.env.EPIC_FHIR_PAGE_SIZE || "100";

  const ep = (k, fallback) =>
    process.env[k] && String(process.env[k]).trim()
      ? String(process.env[k]).trim()
      : fallback;

  const resourceConfig = getResourceConfig(ep, {
    r4: fhir_base_url_r4,
    stu3: fhir_base_url_stu3,
    dstu2: fhir_base_url_dstu2
  });

  let patientId = patientFhirId || search_criteria.PatientId || null;

  const bundleEntries = [];
  const errorEntries = [];
  const seenTypes = new Set();

  const addSingleEntry = (entries, resType) => {
    if (!seenTypes.has(resType)) {
      seenTypes.add(resType);
      bundleEntries.push({
        resourceType: resType,
        data: (entries || []).map(e => e.resource) // always array
      });
    }
  };

  const queryString = buildQueryParams(search_criteria);

  // ✅ LOOP OVER RESOURCES (NO SWITCH)
  for (const resourceType of resources) {
    const cfg = resourceConfig[resourceType];
    if (!cfg) continue;

    if (cfg.requiresPatient && !patientId) continue;

    let url = "";

    try {
      url = cfg.buildUrl({
        patientId,
        patientFhirId,
        queryString,
        pageSize
      });

      const res = await axios.get(url, { headers });

      // ✅ extract patientId if needed
      if (cfg.extractPatientId && res.data?.entry?.[0]?.resource?.id) {
        patientId = res.data.entry[0].resource.id;
      }

      addSingleEntry(res.data?.entry || [{ resource: res.data }], resourceType);

    } catch (error) {
      const msg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      console.error(`❌ Failed to fetch ${resourceType} (${url}): ${msg}`);

      errorEntries.push({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "exception",
            diagnostics: `Failed ${resourceType}: ${msg}`
          }
        ],
        _meta: {
          urlAttempted: url,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  return { bundleEntries, errorEntries, patientId };
}

module.exports = {
  fhirR4Path,
  extractPatientIdsFromListSearchBundle,
  buildPatientDetailsFromList,
  fetchPatientDetailCollectionBundle,
  buildQueryParams,
  buildEpicResourceDataBundle
};
