require("dotenv").config();
const axios = require("axios");
const EpicAuthService = require("./epicAuthService");
const {
  extractPatientIdsFromListSearchBundle,
  buildEpicResourceDataBundle
} = require("./epicService");
const {
  Patient,
  PatientCondition,
  PatientObservation,
  PatientMedication,
  PatientDocumentReference,
  PatientDocumentReferenceContent,
  PatientObservationImaging,
  PatientDocumentRefrenceEntry,
  PatientDischargeSummary,
  DocumentReferenceImagingResult
} = require("../models");

const DEFAULT_GETALL_RESOURCETYPES =
  "basic_patient_data,condition_data,labs_data,medication_request,document_reference,observation_dicom_search,document_reference_imaging_result";
const activePatientSyncJobs = new Map();

function createServiceError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseIncludeDetails(query) {
  if (query.includeDetails === undefined) return true;
  const value = String(query.includeDetails).toLowerCase();
  return value !== "false" && value !== "0" && value !== "no";
}

function getRequestedResources(query) {
  const responsedataRaw = query.responsedata;
  const responsedataStr =
    responsedataRaw !== undefined && String(responsedataRaw).trim() !== ""
      ? String(responsedataRaw)
      : DEFAULT_GETALL_RESOURCETYPES;

  return responsedataStr
    .split(",")
    .map((resource) => resource.trim())
    .filter(Boolean);
}

function getBackendLookupClientId(explicitClinicId) {
  const normalizedClinicId = String(explicitClinicId || "").trim();

  if (normalizedClinicId) {
    return normalizedClinicId;
  }

  const fallbackClientId = [
    process.env.EPIC_CLIENT_ID,
    process.env.SMART_LAUNCH_CLIENT_ID,
    process.env.PROVIDER_CLIENT_ID
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean);

  return fallbackClientId || null;
}

function getDocumentReferenceAttachment(doc) {
  return doc.content?.find((item) => item?.attachment?.url)?.attachment || null;
}

function extractBinaryId(attachmentUrl) {
  if (typeof attachmentUrl !== "string" || !attachmentUrl) return null;
  const binaryIdMatch = attachmentUrl.match(/Binary\/([^/?#]+)/i);
  return binaryIdMatch ? decodeURIComponent(binaryIdMatch[1]) : null;
}

function buildBinaryUrl(fhirBaseUrlStu3, binaryResourceType, attachmentUrl, binaryId) {
  if (typeof attachmentUrl === "string" && /^https?:\/\//i.test(attachmentUrl)) {
    return attachmentUrl;
  }
  return `${fhirBaseUrlStu3}/${binaryResourceType}/${encodeURIComponent(binaryId)}`;
}

function getDocumentReferenceTypeDetails(doc) {
  const codings = Array.isArray(doc.type?.coding) ? doc.type.coding : [];
  const preferredCoding = codings.find((coding) => coding?.display || coding?.code) || null;
  const typeDisplay = preferredCoding?.display || doc.type?.text || null;
  const typeCode = preferredCoding?.code || null;
  const isDischargeSummary = codings.some(
    (coding) =>
      String(coding?.code || "").trim() === "18842-5" &&
      String(coding?.display || "").trim().toLowerCase() === "discharge summary"
  );

  return { typeDisplay, typeCode, isDischargeSummary };
}

function getDocumentReferenceAuthorDetails(doc) {
  const firstAuthor = doc.author?.[0] || null;
  const author = firstAuthor?.display || null;
  const reference = firstAuthor?.reference || null;
  const practitionerIdMatch =
    typeof reference === "string" ? reference.match(/Practitioner\/([^/?#]+)/i) : null;

  return {
    author,
    practitionerId: practitionerIdMatch ? decodeURIComponent(practitionerIdMatch[1]) : null
  };
}

function decodeBinaryContent(binaryPayload, binaryId) {
  if (!binaryPayload?.content) return null;

  try {
    return Buffer.from(binaryPayload.content, "base64").toString("utf-8");
  } catch (decodeErr) {
    console.error(`Error decoding base64 for Binary ${binaryId}:`, decodeErr.message);
    return null;
  }
}

function getBinaryResponseBytes(binaryPayload, binaryId) {
  if (!binaryPayload?.content) return null;

  try {
    return Buffer.from(binaryPayload.content, "base64");
  } catch (decodeErr) {
    console.error(`Error converting Binary ${binaryId} to bytes:`, decodeErr.message);
    return null;
  }
}

function normalizeContentType(contentType) {
  if (!contentType) return null;
  return String(contentType).split(";")[0].trim().toLowerCase() || null;
}

function isTextLikeContentType(contentType) {
  const normalizedContentType = normalizeContentType(contentType);

  if (!normalizedContentType) {
    return false;
  }

  return (
    normalizedContentType.startsWith("text/") ||
    normalizedContentType === "application/json" ||
    normalizedContentType === "application/fhir+json" ||
    normalizedContentType === "application/xml" ||
    normalizedContentType === "application/fhir+xml" ||
    normalizedContentType === "application/xhtml+xml" ||
    normalizedContentType.endsWith("+json") ||
    normalizedContentType.endsWith("+xml")
  );
}

function buildParsedBinaryFields(binaryPayload, binaryId, fallbackContentType = null) {
  if (!binaryPayload?.content) {
    return {
      binaryContentType: normalizeContentType(binaryPayload?.contentType || fallbackContentType),
      binaryContentEncoding: null,
      binaryContent: null
    };
  }

  const binaryContentType = normalizeContentType(
    binaryPayload?.contentType || fallbackContentType
  );

  if (isTextLikeContentType(binaryContentType)) {
    const decodedText = decodeBinaryContent(binaryPayload, binaryId);

    if (decodedText !== null) {
      return {
        binaryContentType,
        binaryContentEncoding: "utf-8",
        binaryContent: decodedText,
        binaryContentText: decodedText
      };
    }
  }

  return {
    binaryContentType,
    binaryContentEncoding: "base64",
    binaryContent: binaryPayload.content,
    binaryContentBase64: binaryPayload.content
  };
}

function convertByteaToUtf8(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString("utf-8");
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => convertByteaToUtf8(item));
  }

  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, innerValue]) => [key, convertByteaToUtf8(innerValue)])
    );
  }

  return value;
}

function buildSearchsetBundle(resources) {
  const entries = Array.isArray(resources)
    ? resources
        .filter(Boolean)
        .map((resource) => ({
          resource
        }))
    : [];

  const total = entries.filter(
    (entry) => entry.resource?.resourceType && entry.resource.resourceType !== "OperationOutcome"
  ).length;

  return {
    resourceType: "Bundle",
    type: "searchset",
    total,
    entry: entries
  };
}

function getBundleDataByResourceType(bundle, resourceType) {
  if (!bundle || !Array.isArray(bundle.entry)) {
    return [];
  }

  const matchingEntry = bundle.entry.find((entry) => entry.resourceType === resourceType);

  return Array.isArray(matchingEntry?.data) ? matchingEntry.data : [];
}

async function enrichDocumentReferenceResources(resources, fhirBaseUrl, listHeaders) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return [];
  }

  const binaryResourceType = process.env.DOCUMENT_REF_BINARY || "Binary";
  const binaryResponseCache = new Map();

  return Promise.all(
    resources.map(async (resource) => {
      if (!resource || resource.resourceType !== "DocumentReference") {
        return resource;
      }

      const contentItems = Array.isArray(resource.content) ? resource.content : [];

      if (contentItems.length === 0) {
        return resource;
      }

      const enrichedContentItems = await Promise.all(
        contentItems.map(async (contentItem) => {
          if (!contentItem || typeof contentItem !== "object") {
            return contentItem;
          }

          const attachment =
            contentItem.attachment && typeof contentItem.attachment === "object"
              ? contentItem.attachment
              : null;
          const attachmentUrl = attachment?.url || null;
          const binaryId = extractBinaryId(attachmentUrl);

          if (!attachment || !binaryId) {
            return contentItem;
          }

          const binaryUrl = buildBinaryUrl(
            fhirBaseUrl,
            binaryResourceType,
            attachmentUrl,
            binaryId
          );

          let binaryPayload = null;
          let binaryError = null;

          try {
            if (!binaryResponseCache.has(binaryUrl)) {
              binaryResponseCache.set(
                binaryUrl,
                axios
                  .get(binaryUrl, {
                    headers: {
                      Authorization: listHeaders.Authorization,
                      Accept: "application/fhir+json"
                    }
                  })
                  .then((response) => response.data)
              );
            }

            binaryPayload = await binaryResponseCache.get(binaryUrl);
          } catch (error) {
            binaryError = error.response?.data
              ? JSON.stringify(error.response.data)
              : error.message;
          }

          return {
            ...contentItem,
            attachment: {
              ...attachment,
              contentType: binaryPayload?.contentType || attachment.contentType || null,
              binaryId,
              binaryUrl,
              ...(binaryPayload ? { binaryResponse: binaryPayload } : {}),
              ...(binaryPayload
                ? buildParsedBinaryFields(binaryPayload, binaryId, attachment.contentType)
                : {}),
              ...(binaryError ? { binaryError } : {})
            }
          };
        })
      );

      return {
        ...resource,
        content: enrichedContentItems
      };
    })
  );
}

async function fetchPatientTableData(model, where, order = [["id", "ASC"]]) {
  const rows = await model.findAll({
    where,
    order,
    raw: true
  });

  return rows.map((row) => convertByteaToUtf8(row));
}

async function upsertByWhere(model, where, values) {
  const existingRecord = await model.findOne({ where });
  if (existingRecord) {
    await existingRecord.update(values);
    return;
  }

  await model.create(values);
}

async function getPatientRecordOrThrow(patientId) {
  const patient = await Patient.findOne({
    where: { fhir_id: patientId },
    raw: true
  });

  if (!patient) {
    throw createServiceError(404, "Patient not found");
  }

  return patient;
}

async function getPatientDataById(patientId) {
  const normalizedPatientId = String(patientId || "").trim();
  if (!normalizedPatientId) {
    throw createServiceError(400, "patientId query param is required");
  }

  const patient = await getPatientRecordOrThrow(normalizedPatientId);

  const [
    conditions,
    observations,
    medications,
    documentReferences,
    documentReferenceContent,
    documentReferenceEntries,
    dischargeSummaries,
    observationImaging,
    documentReferenceImagingResults
  ] = await Promise.all([
    fetchPatientTableData(PatientCondition, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientObservation, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientMedication, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientDocumentReference, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientDocumentReferenceContent, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientDocumentRefrenceEntry, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientDischargeSummary, { patient_id: normalizedPatientId }),
    fetchPatientTableData(PatientObservationImaging, { patient_id: normalizedPatientId }),
    fetchPatientTableData(DocumentReferenceImagingResult, { patient_id: normalizedPatientId })
  ]);

  return {
    status: { code: 200, message: "Success" },
    patientId: normalizedPatientId,
    data: {
      patient: convertByteaToUtf8(patient),
      conditions,
      observations,
      medications,
      document_references: documentReferences,
      document_reference_content: documentReferenceContent,
      patient_document_refrence_entries: documentReferenceEntries,
      patient_discharge_summary: dischargeSummaries,
      observation_imaging: observationImaging,
      document_reference_imaging_result: documentReferenceImagingResults
    }
  };
}

async function fetchPatientListBundle(clinicId) {
  const normalizedClinicId = getBackendLookupClientId(clinicId);
  if (!normalizedClinicId) {
    throw createServiceError(400, "clinicId query param is required");
  }

  const epicService = new EpicAuthService(normalizedClinicId);
  const authData = await epicService.getAuthToken();
  const orgId = epicService.orgId;

  if (!orgId) {
    throw createServiceError(400, "OrgId not found in database for this client");
  }

  const accessToken = authData.data?.access_token;
  if (!accessToken) {
    throw createServiceError(500, "Failed to get Epic token");
  }

  const epicUrl = `${epicService.fhirBaseUrlR4}/List?code=patients&identifier=${process.env.EPIC_ORG_IDENTIFIER}|${orgId}`;
  const epicResponse = await axios.get(epicUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/fhir+json, application/json"
    }
  });

  return {
    epicService,
    orgId,
    accessToken,
    listBundle: epicResponse.data
  };
}

function buildListHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/fhir+json, application/json"
  };
}

async function fetchPatientBundle({ patientId, resources, baseUrls, headers }) {
  const { bundleEntries, errorEntries, patientId: resolvedPatientId } =
    await buildEpicResourceDataBundle({
      fhir_base_url_r4: baseUrls.r4,
      fhir_base_url_stu3: baseUrls.stu3,
      fhir_base_url_dstu2: baseUrls.dstu2,
      headers,
      resources,
      search_criteria: {},
      patientFhirId: patientId
    });

  return {
    patientId: resolvedPatientId || patientId,
    bundle: {
      resourceType: "Bundle",
      type: "collection",
      total: bundleEntries.length,
      entry: bundleEntries,
      errors: errorEntries
    }
  };
}

async function persistBasicPatientData(bundle, fallbackPatientId) {
  const basicDataEntry = bundle.entry.find((entry) => entry.resourceType === "basic_patient_data");
  let resolvedPatientId = fallbackPatientId;

  if (!basicDataEntry?.data?.length) {
    return resolvedPatientId;
  }

  for (const resource of basicDataEntry.data) {
    if (resource.resourceType === "OperationOutcome") {
      console.warn(
        `Skipping OperationOutcome for basic_patient_data, patientId: ${fallbackPatientId}`
      );
      console.warn(`Raw OperationOutcome:`, JSON.stringify(resource, null, 2));
      continue;
    }

    if (resource.id) {
      resolvedPatientId = resource.id;
    }

    const epicPatientId =
      resource.identifier?.find((identifier) => identifier.type?.text === "EPIC")?.value || null;
    const mrn =
      resource.identifier?.find((identifier) => identifier.type?.text === "EPI")?.value || null;
    const externalId =
      resource.identifier?.find((identifier) => identifier.type?.text === "EXTERNAL")?.value || null;
    const ceid =
      resource.identifier?.find((identifier) => identifier.type?.text === "CEID")?.value || null;

    const officialName = resource.name?.find((name) => name.use === "official") || resource.name?.[0];
    const fullName = officialName?.text || null;
    const firstName = officialName?.given?.[0] || null;
    const lastName = officialName?.family || null;

    const gender = resource.gender || null;
    const birthDate = resource.birthDate ? new Date(resource.birthDate) : null;
    const deceased = resource.deceasedBoolean || false;
    const active = resource.active !== undefined ? resource.active : null;

    const legalSex =
      resource.extension
        ?.find((extension) => extension.url?.includes("legal-sex"))
        ?.valueCodeableConcept?.coding?.[0]?.display || null;
    const sexForClinicalUse =
      resource.extension
        ?.find((extension) => extension.url?.includes("sex-for-clinical-use"))
        ?.valueCodeableConcept?.coding?.[0]?.display || null;
    const raceExt = resource.extension?.find((extension) => extension.url?.includes("us-core-race"));
    const race = raceExt?.extension?.find((extension) => extension.url === "text")?.valueString || null;
    const ethnicityExt = resource.extension?.find((extension) =>
      extension.url?.includes("us-core-ethnicity")
    );
    const ethnicity =
      ethnicityExt?.extension?.find((extension) => extension.url === "text")?.valueString || null;
    const pronouns =
      resource.extension
        ?.find((extension) => extension.url?.includes("calculated-pronouns"))
        ?.valueCodeableConcept?.coding?.[0]?.display || null;

    const phoneHome =
      resource.telecom?.find((telecom) => telecom.use === "home" && telecom.system === "phone")
        ?.value || null;
    const phoneWork =
      resource.telecom?.find((telecom) => telecom.use === "work" && telecom.system === "phone")
        ?.value || null;

    const homeAddress = resource.address?.find((address) => address.use === "home") || resource.address?.[0];
    const addressLine = homeAddress?.line?.[0] || null;
    const addressCity = homeAddress?.city || null;
    const addressState = homeAddress?.state || null;
    const addressPostal = homeAddress?.postalCode || null;
    const addressCountry = homeAddress?.country || null;
    const addressStart = homeAddress?.period?.start ? new Date(homeAddress.period.start) : null;

    const contact = resource.contact?.[0];
    const emergencyContactName = contact?.name?.text || null;
    const emergencyContactPhone = contact?.telecom?.[0]?.value || null;
    const emergencyContactRelation = contact?.relationship?.[0]?.coding?.[0]?.display || null;

    const managingOrganization = resource.managingOrganization?.display || null;

    try {
      await upsertByWhere(
        Patient,
        { fhir_id: resolvedPatientId },
        {
          fhir_id: resolvedPatientId,
          epic_patient_id: epicPatientId,
          mrn,
          external_id: externalId,
          ceid,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          gender,
          birth_date: birthDate,
          deceased,
          active,
          legal_sex: legalSex,
          sex_for_clinical_use: sexForClinicalUse,
          race,
          ethnicity,
          pronouns,
          phone_home: phoneHome,
          phone_work: phoneWork,
          address_line: addressLine,
          address_city: addressCity,
          address_state: addressState,
          address_postal: addressPostal,
          address_country: addressCountry,
          address_start: addressStart,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          emergency_contact_relation: emergencyContactRelation,
          managing_organization: managingOrganization,
          raw: resource
        }
      );
    } catch (error) {
      console.error(`Error saving Patient ${resolvedPatientId}:`, error.message);
    }
  }

  return resolvedPatientId;
}

async function persistConditionData(bundle, patientId) {
  const conditionDataEntry = bundle.entry.find((entry) => entry.resourceType === "condition_data");
  if (!conditionDataEntry?.data?.length) {
    return;
  }

  for (const resource of conditionDataEntry.data) {
    if (resource.resourceType === "OperationOutcome") {
      console.warn(`Skipping OperationOutcome for condition_data, patientId: ${patientId}`);
      console.warn(`Raw OperationOutcome:`, JSON.stringify(resource, null, 2));
      continue;
    }
    if (resource.resourceType !== "Condition") continue;

    const fhirConditionId = resource.id;
    if (!fhirConditionId) continue;

    try {
      await upsertByWhere(
        PatientCondition,
        { fhir_condition_id: fhirConditionId },
        {
          patient_id: patientId,
          fhir_condition_id: fhirConditionId,
          clinical_status: resource.clinicalStatus?.coding?.[0]?.code || null,
          clinical_status_display: resource.clinicalStatus?.text || null,
          verification_status: resource.verificationStatus?.coding?.[0]?.code || null,
          category: resource.category?.[0]?.coding?.[0]?.code || null,
          category_display: resource.category?.[0]?.text || null,
          condition_text: resource.code?.text || null,
          icd10_code:
            resource.code?.coding?.find((coding) => coding.system?.includes("icd-10-cm"))?.code || null,
          icd10_display:
            resource.code?.coding?.find((coding) => coding.system?.includes("icd-10-cm"))?.display ||
            null,
          icd9_code:
            resource.code?.coding?.find((coding) => coding.system?.includes("icd-9-cm"))?.code || null,
          icd9_display:
            resource.code?.coding?.find((coding) => coding.system?.includes("icd-9-cm"))?.display || null,
          snomed_code:
            resource.code?.coding?.find((coding) => coding.system?.includes("snomed"))?.code || null,
          snomed_display:
            resource.code?.coding?.find((coding) => coding.system?.includes("snomed"))?.display || null,
          subject_reference: resource.subject?.reference || null,
          subject_display: resource.subject?.display || null,
          onset_date: resource.onsetDateTime ? new Date(resource.onsetDateTime) : null,
          recorded_date: resource.recordedDate ? new Date(resource.recordedDate) : null,
          note_author: resource.note?.[0]?.authorReference?.display || null,
          note_time: resource.note?.[0]?.time ? new Date(resource.note[0].time) : null,
          note_text: resource.note?.[0]?.text || null,
          raw: resource
        }
      );
    } catch (error) {
      console.error(`Error saving Condition ${fhirConditionId}:`, error.message);
    }
  }
}

async function persistLabData(bundle, patientId) {
  const labsDataEntry = bundle.entry.find((entry) => entry.resourceType === "labs_data");
  if (!labsDataEntry?.data?.length) {
    return;
  }

  for (const resource of labsDataEntry.data) {
    if (resource.resourceType === "OperationOutcome") {
      console.warn(`Skipping OperationOutcome for labs_data, patientId: ${patientId}`);
      console.warn(`Raw OperationOutcome:`, JSON.stringify(resource, null, 2));
      continue;
    }
    if (resource.resourceType !== "Observation") continue;

    const fhirObservationId = resource.id;
    if (!fhirObservationId) continue;

    const refRange = resource.referenceRange?.[0];

    try {
      await upsertByWhere(
        PatientObservation,
        { fhir_observation_id: fhirObservationId },
        {
          patient_id: patientId,
          fhir_observation_id: fhirObservationId,
          based_on_reference: resource.basedOn?.[0]?.reference || null,
          order_name: resource.basedOn?.[0]?.display || null,
          status: resource.status || null,
          category: resource.category?.[0]?.text || null,
          loinc_code:
            resource.code?.coding?.find((coding) => coding.system?.includes("loinc"))?.code || null,
          loinc_display:
            resource.code?.coding?.find((coding) => coding.system?.includes("loinc"))?.display || null,
          local_code:
            resource.code?.coding?.find((coding) => coding.system?.includes("768282"))?.code || null,
          local_display:
            resource.code?.coding?.find((coding) => coding.system?.includes("768282"))?.display || null,
          test_name: resource.code?.text || null,
          subject_reference: resource.subject?.reference || null,
          subject_display: resource.subject?.display || null,
          encounter_reference: resource.encounter?.reference || null,
          encounter_id: resource.encounter?.identifier?.value || null,
          encounter_type: resource.encounter?.display || null,
          effective_date_time: resource.effectiveDateTime ? new Date(resource.effectiveDateTime) : null,
          issued_date_time: resource.issued ? new Date(resource.issued) : null,
          value:
            resource.valueQuantity?.value !== undefined ? String(resource.valueQuantity.value) : null,
          unit: resource.valueQuantity?.unit || null,
          interpretation_code: resource.interpretation?.[0]?.coding?.[0]?.code || null,
          interpretation_display: resource.interpretation?.[0]?.text || null,
          specimen_reference: resource.specimen?.reference || null,
          reference_range_low:
            refRange?.low?.value !== undefined ? String(refRange.low.value) : null,
          reference_range_low_unit: refRange?.low?.unit || null,
          reference_range_high:
            refRange?.high?.value !== undefined ? String(refRange.high.value) : null,
          reference_range_high_unit: refRange?.high?.unit || null,
          reference_range_text: refRange?.text || null,
          raw: resource
        }
      );
    } catch (error) {
      console.error(`Error saving Lab ${fhirObservationId}:`, error.message);
    }
  }
}

async function persistMedicationRequests(bundle, patientId) {
  const medicationRequestEntry = bundle.entry.find(
    (entry) => entry.resourceType === "medication_request"
  );
  if (!medicationRequestEntry?.data?.length) {
    return;
  }

  for (const resource of medicationRequestEntry.data) {
    if (resource.resourceType === "OperationOutcome") {
      console.warn(`Skipping OperationOutcome for medication_request, patientId: ${patientId}`);
      console.warn(`Raw OperationOutcome:`, JSON.stringify(resource, null, 2));
      continue;
    }
    if (resource.resourceType !== "MedicationRequest") continue;

    const fhirMedicationRequestId = resource.id;
    if (!fhirMedicationRequestId) continue;

    try {
      await upsertByWhere(
        PatientMedication,
        { fhir_medication_request_id: fhirMedicationRequestId },
        {
          patient_id: patientId,
          fhir_medication_request_id: fhirMedicationRequestId,
          status: resource.status || null,
          intent: resource.intent || null,
          category:
            resource.category?.[0]?.text || resource.category?.[0]?.coding?.[0]?.display || null,
          medication_reference: resource.medicationReference?.reference || null,
          medication_display: resource.medicationReference?.display || null,
          subject_reference: resource.subject?.reference || null,
          subject_display: resource.subject?.display || null,
          encounter_reference: resource.encounter?.reference || null,
          authored_on: resource.authoredOn ? new Date(resource.authoredOn) : null,
          requester_display: resource.requester?.display || null,
          reason_code_text:
            resource.reasonCode?.[0]?.text || resource.reasonCode?.[0]?.coding?.[0]?.display || null,
          dosage_instruction_text: resource.dosageInstruction?.[0]?.text || null,
          raw: resource
        }
      );
    } catch (error) {
      console.error(
        `Error saving MedicationRequest ${fhirMedicationRequestId}:`,
        error.message
      );
    }
  }
}

async function persistDocumentReferenceBundle(bundle, patientId, fhirBaseUrlStu3, listHeaders) {
  const docRefEntry = bundle.entry.find((entry) => entry.resourceType === "document_reference");
  if (!docRefEntry?.data?.length) {
    return;
  }

  const validDocs = docRefEntry.data.filter(
    (resource) => resource.resourceType === "DocumentReference"
  );
  if (!validDocs.length) {
    return;
  }

  try {
    await upsertByWhere(
      PatientDocumentReference,
      { patient_id: patientId },
      {
        patient_id: patientId,
        raw: validDocs
      }
    );
  } catch (error) {
    console.error(`Error saving DocumentReference for patient ${patientId}:`, error.message);
  }

  const binaryResourceType = process.env.DOCUMENT_REF_BINARY || "Binary";

  for (const doc of validDocs) {
    try {
      const documentReferenceId = doc.id;
      if (!documentReferenceId) continue;

      const attachment = getDocumentReferenceAttachment(doc);
      const attachmentUrl = attachment?.url || null;
      const binaryId = extractBinaryId(attachmentUrl);
      const { typeDisplay, typeCode, isDischargeSummary } =
        getDocumentReferenceTypeDetails(doc);
      const { author, practitionerId } = getDocumentReferenceAuthorDetails(doc);

      let binaryPayload = null;
      let binaryResponseBytes = null;
      let contentType = attachment?.contentType || null;

      if (binaryId) {
        const binaryUrl = buildBinaryUrl(
          fhirBaseUrlStu3,
          binaryResourceType,
          attachmentUrl,
          binaryId
        );

        try {
          const binaryResponse = await axios.get(binaryUrl, {
            headers: {
              Authorization: listHeaders.Authorization,
              Accept: "application/fhir+json"
            }
          });

          binaryPayload = binaryResponse.data;
          binaryResponseBytes = getBinaryResponseBytes(binaryPayload, binaryId);
          contentType = binaryPayload?.contentType || contentType;
          decodeBinaryContent(binaryPayload, binaryId);

          await upsertByWhere(
            PatientDocumentReferenceContent,
            { binary_id: binaryId },
            {
              patient_id: patientId,
              document_reference_id: documentReferenceId,
              binary_id: binaryId,
              content_type: contentType,
              raw: binaryResponseBytes
            }
          );
        } catch (error) {
          console.error(
            `Error fetching Binary ${binaryId} for patient ${patientId}:`,
            error.message
          );
        }
      }

      await upsertByWhere(
        PatientDocumentRefrenceEntry,
        {
          patient_id: patientId,
          resource_id: documentReferenceId
        },
        {
          patient_id: patientId,
          resource_id: documentReferenceId,
          type: typeDisplay,
          type_code: typeCode,
          date: doc.created ? new Date(doc.created) : null,
          author,
          practitioner_id: practitionerId,
          raw: binaryPayload,
          content: binaryResponseBytes,
          binary_id: binaryId
        }
      );

      if (isDischargeSummary && binaryId) {
        await upsertByWhere(
          PatientDischargeSummary,
          {
            patient_id: patientId,
            binary_id: binaryId
          },
          {
            patient_id: patientId,
            binary_id: binaryId,
            raw: binaryPayload,
            content: binaryResponseBytes
          }
        );
      }
    } catch (error) {
      console.error(
        `Error processing DocumentReference entry for patient ${patientId}:`,
        error.message
      );
    }
  }
}

async function persistImagingObservationData(bundle, patientId) {
  const imagingObsEntry = bundle.entry.find(
    (entry) => entry.resourceType === "observation_dicom_search"
  );
  if (!imagingObsEntry?.data?.length) {
    return;
  }

  for (const resource of imagingObsEntry.data) {
    if (resource.resourceType === "OperationOutcome") {
      console.warn(
        `Skipping OperationOutcome for observation_dicom_search, patientId: ${patientId}`
      );
      console.warn(`Raw OperationOutcome:`, JSON.stringify(resource, null, 2));
      continue;
    }
    if (resource.resourceType !== "Observation") continue;

    const fhirObservationId = resource.id;
    if (!fhirObservationId) continue;

    try {
      await upsertByWhere(
        PatientObservationImaging,
        { fhir_observation_id: fhirObservationId },
        {
          patient_id: patientId,
          fhir_observation_id: fhirObservationId,
          status: resource.status || null,
          category: resource.category?.[0]?.text || resource.category?.[0]?.coding?.[0]?.display || null,
          code: resource.code?.coding?.[0]?.code || null,
          code_display: resource.code?.coding?.[0]?.display || null,
          code_text: resource.code?.text || null,
          subject_reference: resource.subject?.reference || null,
          subject_display: resource.subject?.display || null,
          encounter_reference: resource.encounter?.reference || null,
          encounter_display: resource.encounter?.display || null,
          effective_date_time: resource.effectiveDateTime ? new Date(resource.effectiveDateTime) : null,
          issued_date_time: resource.issued ? new Date(resource.issued) : null,
          value_string: resource.valueString || resource.valueCodeableConcept?.text || null,
          value_code: resource.valueCodeableConcept?.coding?.[0]?.code || null,
          value_display: resource.valueCodeableConcept?.coding?.[0]?.display || null,
          derived_from_reference: resource.derivedFrom?.[0]?.reference || null,
          derived_from_display: resource.derivedFrom?.[0]?.display || null,
          based_on_reference: resource.basedOn?.[0]?.reference || null,
          based_on_display: resource.basedOn?.[0]?.display || null,
          note_text: resource.note?.[0]?.text || null,
          raw: resource
        }
      );
    } catch (error) {
      console.error(`Error saving Observation Imaging ${fhirObservationId}:`, error.message);
    }
  }
}

async function persistDocumentReferenceImagingResult(bundle, patientId, fhirBaseUrlStu3, listHeaders) {
  const docRefImagingEntry = bundle.entry.find(
    (entry) => entry.resourceType === "document_reference_imaging_result"
  );
  if (!docRefImagingEntry?.data?.length) {
    return;
  }

  const binaryResourceType = process.env.DOCUMENT_REF_BINARY || "Binary";

  for (const resource of docRefImagingEntry.data) {
    if (resource.resourceType === "OperationOutcome") {
      console.warn(
        `Skipping OperationOutcome for document_reference_imaging_result, patientId: ${patientId}`
      );
      console.warn(`Raw OperationOutcome:`, JSON.stringify(resource, null, 2));
      continue;
    }
    if (resource.resourceType !== "DocumentReference") continue;

    const resourceId = resource.id;
    if (!resourceId) continue;

    // Extract binary id from content[].attachment.url
    const attachment = getDocumentReferenceAttachment(resource);
    const attachmentUrl = attachment?.url || null;
    const binaryId = extractBinaryId(attachmentUrl);
    const contentType = attachment?.contentType || null;

    // Parse category
    const categoryCoding = resource.category?.[0]?.coding?.[0];
    const categoryCode = categoryCoding?.code || null;
    const categoryDisplay = categoryCoding?.display || resource.category?.[0]?.text || null;

    // Parse author
    const firstAuthor = resource.author?.[0];
    const authorDisplay = firstAuthor?.display || null;
    const authorReference = firstAuthor?.reference || null;

    // Parse context
    const encounterRef = resource.context?.encounter?.[0];
    const practiceSetting = resource.context?.practiceSetting;

    // Fetch binary content (PDF as base64)
    let binaryPayload = null;
    let binaryContentBase64 = null;

    if (binaryId) {
      const binaryUrl = buildBinaryUrl(
        fhirBaseUrlStu3,
        binaryResourceType,
        attachmentUrl,
        binaryId
      );

      try {
        const binaryResponse = await axios.get(binaryUrl, {
          headers: {
            Authorization: listHeaders.Authorization,
            Accept: "application/fhir+json"
          }
        });

        binaryPayload = binaryResponse.data;
        // The Binary resource .content field is already base64-encoded
        binaryContentBase64 = binaryPayload?.content || null;
      } catch (error) {
        console.error(
          `Error fetching Binary ${binaryId} for imaging result, patient ${patientId}:`,
          error.message
        );
      }
    }

    try {
      await upsertByWhere(
        DocumentReferenceImagingResult,
        {
          patient_id: patientId,
          resource_id: resourceId
        },
        {
          patient_id: patientId,
          resource_id: resourceId,
          binary_id: binaryId,
          status: resource.status || null,
          doc_status: resource.docStatus || null,
          type_text: resource.type?.text || null,
          category_code: categoryCode,
          category_display: categoryDisplay,
          subject_reference: resource.subject?.reference || null,
          subject_display: resource.subject?.display || null,
          date: resource.date ? new Date(resource.date) : null,
          author: authorDisplay,
          author_reference: authorReference,
          description: resource.description || null,
          content_type: contentType,
          encounter_reference: encounterRef?.reference || null,
          encounter_display: encounterRef?.display || null,
          practice_setting_code: practiceSetting?.coding?.[0]?.code || null,
          practice_setting_display: practiceSetting?.coding?.[0]?.display || practiceSetting?.text || null,
          period_start: resource.context?.period?.start ? new Date(resource.context.period.start) : null,
          period_end: resource.context?.period?.end ? new Date(resource.context.period.end) : null,
          raw: resource,
          binary_raw: binaryPayload,
          binary_content: binaryContentBase64 ? Buffer.from(binaryContentBase64, 'base64') : null
        }
      );
    } catch (error) {
      console.error(
        `Error saving DocumentReference ImagingResult ${resourceId} for patient ${patientId}:`,
        error.message
      );
    }
  }
}

async function persistPatientBundle(bundleRecord, baseUrls, listHeaders) {
  const { patientId, bundle } = bundleRecord;
  if (!bundle?.entry) {
    return;
  }

  const resolvedPatientId = await persistBasicPatientData(bundle, patientId);

  await persistConditionData(bundle, resolvedPatientId);
  await persistLabData(bundle, resolvedPatientId);
  await persistMedicationRequests(bundle, resolvedPatientId);
  await persistDocumentReferenceBundle(
    bundle,
    resolvedPatientId,
    baseUrls.stu3,
    listHeaders
  );
  await persistImagingObservationData(bundle, resolvedPatientId);
  await persistDocumentReferenceImagingResult(
    bundle,
    resolvedPatientId,
    baseUrls.stu3,
    listHeaders
  );
}

function mergeAdditionalPatientIds(patientIds) {
  const additionalPatientIds = (process.env.ADDITIONAL_PATIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return [...new Set([...patientIds, ...additionalPatientIds])];
}

function buildPatientSyncJobKey(clinicId, orgId) {
  return `${String(clinicId || "").trim()}:${String(orgId || "").trim()}`;
}

function startPatientSyncJob({
  clinicId,
  orgId,
  patientIds,
  resources,
  baseUrls,
  listHeaders
}) {
  const jobKey = buildPatientSyncJobKey(clinicId, orgId);
  const existingJob = activePatientSyncJobs.get(jobKey);

  if (existingJob) {
    return {
      jobKey,
      alreadyRunning: true,
      startedAt: existingJob.startedAt
    };
  }

  const startedAt = new Date().toISOString();
  activePatientSyncJobs.set(jobKey, {
    startedAt,
    totalPatients: patientIds.length,
    processedPatients: 0
  });

  setImmediate(async () => {
    console.log(
      `[Epic Sync ${jobKey}] Background sync started for ${patientIds.length} patients`
    );

    try {
      for (const [index, patientId] of patientIds.entries()) {
        try {
          const patientBundle = await fetchPatientBundle({
            patientId,
            resources,
            baseUrls,
            headers: listHeaders
          });

          await persistPatientBundle(patientBundle, baseUrls, listHeaders);

          const progress = activePatientSyncJobs.get(jobKey);
          if (progress) {
            progress.processedPatients = index + 1;
          }

          console.log(
            `[Epic Sync ${jobKey}] Saved patient ${patientBundle.patientId} (${index + 1}/${patientIds.length})`
          );
        } catch (error) {
          console.error(
            `[Epic Sync ${jobKey}] Failed patient ${patientId}:`,
            error.message
          );
        }
      }

      console.log(`[Epic Sync ${jobKey}] Background sync completed`);
    } catch (error) {
      console.error(`[Epic Sync ${jobKey}] Background sync failed:`, error.message);
    } finally {
      activePatientSyncJobs.delete(jobKey);
    }
  });

  return {
    jobKey,
    alreadyRunning: false,
    startedAt
  };
}

async function getAllPatientList(query) {
  const { clinicId } = query;
  const { epicService, orgId, accessToken, listBundle } = await fetchPatientListBundle(clinicId);

  if (!parseIncludeDetails(query)) {
    return {
      status: { code: 200, message: "Success" },
      orgId,
      total: listBundle?.total || 0,
      patientData: listBundle
    };
  }

  let patientIds = extractPatientIdsFromListSearchBundle(listBundle);
  patientIds = mergeAdditionalPatientIds(patientIds);

  const listHeaders = buildListHeaders(accessToken);
  const baseUrls = {
    r4: epicService.fhirBaseUrlR4,
    stu3: epicService.fhirBaseUrlSTU3,
    dstu2: epicService.fhirBaseUrlDSTU2
  };
  const resources = getRequestedResources(query);
  const syncJob = startPatientSyncJob({
    clinicId,
    orgId,
    patientIds,
    resources,
    baseUrls,
    listHeaders
  });

  return {
    status: {
      code: 202,
      message: syncJob.alreadyRunning
        ? "Patient sync is already running in background"
        : "Patient synchronization is running in the background. This may take a few minutes based on the patient count."
    },
    orgId,
    total: listBundle?.total || 0,
    patientCount: patientIds.length,
    patientIds,
    backgroundJob: {
      jobKey: syncJob.jobKey,
      startedAt: syncJob.startedAt,
      status: syncJob.alreadyRunning ? "already_running" : "started"
    }
  };
}

async function getPatientPrefetchData(query) {
  const normalizedPatientId = String(query.patientId || "").trim();
  if (!normalizedPatientId) {
    throw createServiceError(400, "patientId query param is required");
  }

  const clinicId = getBackendLookupClientId(query.clinicId);
  if (!clinicId) {
    throw createServiceError(400, "clinicId query param is required");
  }

  const epicService = new EpicAuthService(clinicId);
  const authData = await epicService.getAuthToken();
  const accessToken = authData.data?.access_token;

  if (!accessToken) {
    throw createServiceError(
      authData.status || 500,
      authData.message?.message || authData.message || "Failed to get Epic token"
    );
  }

  const listHeaders = buildListHeaders(accessToken);
  const baseUrls = {
    r4: epicService.fhirBaseUrlR4,
    stu3: epicService.fhirBaseUrlSTU3,
    dstu2: epicService.fhirBaseUrlDSTU2
  };
  const resources = getRequestedResources(query);
  const patientBundle = await fetchPatientBundle({
    patientId: normalizedPatientId,
    resources,
    baseUrls,
    headers: listHeaders
  });

  const basicPatientData = getBundleDataByResourceType(patientBundle.bundle, "basic_patient_data");
  const patient =
    basicPatientData.find((resource) => resource?.resourceType === "Patient") || basicPatientData[0] || null;
  const conditions = getBundleDataByResourceType(patientBundle.bundle, "condition_data");
  const labs = getBundleDataByResourceType(patientBundle.bundle, "labs_data");
  const medicationRequests = getBundleDataByResourceType(
    patientBundle.bundle,
    "medication_request"
  );
  const imagingObservations = getBundleDataByResourceType(
    patientBundle.bundle,
    "observation_dicom_search"
  );
  const documentReferences = await enrichDocumentReferenceResources(
    getBundleDataByResourceType(patientBundle.bundle, "document_reference"),
    baseUrls.stu3,
    listHeaders
  );
  const imagingResults = await enrichDocumentReferenceResources(
    getBundleDataByResourceType(patientBundle.bundle, "document_reference_imaging_result"),
    baseUrls.r4,
    listHeaders
  );

  return {
    status: { code: 200, message: "Success" },
    patientId: normalizedPatientId,
    clinicId,
    data: {
      patient,
      conditions: buildSearchsetBundle(conditions),
      labs: buildSearchsetBundle(labs),
      medicationRequests: buildSearchsetBundle(medicationRequests),
      documentReferences: buildSearchsetBundle(documentReferences),
      imagingObservations: buildSearchsetBundle(imagingObservations),
      imagingResults: buildSearchsetBundle(imagingResults),
      errors: Array.isArray(patientBundle.bundle.errors) ? patientBundle.bundle.errors : []
    }
  };
}

module.exports = {
  getAllPatientList,
  getPatientDataById,
  getPatientPrefetchData
};
