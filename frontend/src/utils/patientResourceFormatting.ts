export type DetailRow = {
  label: string
  value: string
}

function pickDisplayOrCode(coding: { display?: string; code?: string } | null) {
  if (!coding) {
    return ''
  }

  return coding.display || coding.code || ''
}

function compactParts(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => typeof part === 'string' && part.trim().length > 0).join(' | ')
}

function getOptionalDateLike(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function getOptionalStatus(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function getOptionalCodeableConceptText(value: unknown) {
  const text = getCodeableConceptText(value)
  return text === 'Not available' ? null : text
}

function getOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function getCodeableConceptCoding(
  value: unknown,
  matcher: (coding: { system?: string; code?: string; display?: string }) => boolean,
) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const coding = Array.isArray((value as { coding?: unknown[] }).coding)
    ? ((value as { coding?: Array<{ system?: string; code?: string; display?: string }> }).coding ?? [])
    : []

  return coding.find((entry) => entry && matcher(entry)) ?? null
}

function formatConditionCoding(label: string, code: string | null, display: string | null) {
  if (!code) {
    return null
  }

  return display ? `${label}: ${code} (${display})` : `${label}: ${code}`
}

function getConditionCodeDetails(condition: Record<string, unknown>) {
  const icd10Coding = getCodeableConceptCoding(
    condition.code,
    (coding) => coding.system === 'http://hl7.org/fhir/sid/icd-10-cm',
  )
  const icd9Coding = getCodeableConceptCoding(
    condition.code,
    (coding) => coding.system === 'http://hl7.org/fhir/sid/icd-9-cm',
  )

  return compactParts([
    formatConditionCoding(
      'ICD-10',
      getOptionalString(condition.icd10_code) || getOptionalString(icd10Coding?.code),
      getOptionalString(condition.icd10_display) || getOptionalString(icd10Coding?.display),
    ),
    formatConditionCoding(
      'ICD-9',
      getOptionalString(condition.icd9_code) || getOptionalString(icd9Coding?.code),
      getOptionalString(condition.icd9_display) || getOptionalString(icd9Coding?.display),
    ),
  ])
}

export function getCodeableConceptText(value: unknown) {
  if (!value || typeof value !== 'object') {
    return 'Not available'
  }

  if (typeof (value as { text?: unknown }).text === 'string' && (value as { text?: string }).text) {
    return (value as { text?: string }).text ?? 'Not available'
  }

  const coding = Array.isArray((value as { coding?: unknown[] }).coding)
    ? ((value as { coding?: Array<{ display?: string; code?: string }> }).coding ?? [])
    : []
  const firstCoding = coding.find((entry) => entry && (entry.display || entry.code)) ?? null

  return pickDisplayOrCode(firstCoding) || 'Not available'
}

export function getObservationValue(resource: Record<string, unknown>) {
  if (typeof resource.valueString === 'string' && resource.valueString) {
    return resource.valueString
  }

  if (typeof resource.valueQuantity === 'object' && resource.valueQuantity) {
    const quantity = resource.valueQuantity as { value?: unknown; unit?: unknown }
    const value = typeof quantity.value === 'number' || typeof quantity.value === 'string' ? quantity.value : ''
    const unit = typeof quantity.unit === 'string' ? quantity.unit : ''
    const combined = `${value} ${unit}`.trim()

    if (combined) {
      return combined
    }
  }

  if (typeof resource.valueCodeableConcept === 'object' && resource.valueCodeableConcept) {
    return getCodeableConceptText(resource.valueCodeableConcept)
  }

  return 'Not available'
}

export function getPrimaryAddress(resource: Record<string, unknown> | null) {
  const addresses = Array.isArray(resource?.address) ? resource.address : []
  const primaryAddress =
    addresses.find(
      (address) => typeof address === 'object' && address && (address as { use?: string }).use === 'home',
    ) ?? addresses[0]

  if (!primaryAddress || typeof primaryAddress !== 'object') {
    return 'Not available'
  }

  const line = Array.isArray((primaryAddress as { line?: unknown[] }).line)
    ? ((primaryAddress as { line?: string[] }).line ?? []).join(', ')
    : ''
  const city =
    typeof (primaryAddress as { city?: unknown }).city === 'string'
      ? ((primaryAddress as { city?: string }).city ?? '')
      : ''
  const state =
    typeof (primaryAddress as { state?: unknown }).state === 'string'
      ? ((primaryAddress as { state?: string }).state ?? '')
      : ''
  const postalCode =
    typeof (primaryAddress as { postalCode?: unknown }).postalCode === 'string'
      ? ((primaryAddress as { postalCode?: string }).postalCode ?? '')
      : ''
  const country =
    typeof (primaryAddress as { country?: unknown }).country === 'string'
      ? ((primaryAddress as { country?: string }).country ?? '')
      : ''

  const composedAddress = [line, city, state, postalCode, country].filter(Boolean).join(', ')
  return composedAddress || 'Not available'
}

export function getPrimaryContacts(resource: Record<string, unknown> | null) {
  const telecom = Array.isArray(resource?.telecom) ? resource.telecom : []

  const phone = telecom.find(
    (entry) => typeof entry === 'object' && entry && (entry as { system?: string }).system === 'phone',
  )
  const email = telecom.find(
    (entry) => typeof entry === 'object' && entry && (entry as { system?: string }).system === 'email',
  )

  return {
    phone:
      typeof (phone as { value?: unknown } | undefined)?.value === 'string'
        ? ((phone as { value?: string }).value ?? 'Not available')
        : 'Not available',
    email:
      typeof (email as { value?: unknown } | undefined)?.value === 'string'
        ? ((email as { value?: string }).value ?? 'Not available')
        : 'Not available',
  }
}

export function getPrimaryCareProvider(resource: Record<string, unknown> | null) {
  const practitioners = Array.isArray(resource?.generalPractitioner) ? resource.generalPractitioner : []
  const practitioner = practitioners[0]

  if (!practitioner || typeof practitioner !== 'object') {
    return 'Not available'
  }

  if (typeof (practitioner as { display?: unknown }).display === 'string') {
    return (practitioner as { display?: string }).display ?? 'Not available'
  }

  if (typeof (practitioner as { reference?: unknown }).reference === 'string') {
    return (practitioner as { reference?: string }).reference ?? 'Not available'
  }

  return 'Not available'
}

export function getManagingOrganization(resource: Record<string, unknown> | null) {
  const organization =
    resource?.managingOrganization && typeof resource.managingOrganization === 'object'
      ? (resource.managingOrganization as { display?: unknown; reference?: unknown })
      : null

  if (!organization) {
    return 'Not available'
  }

  if (typeof organization.display === 'string' && organization.display) {
    return organization.display
  }

  if (typeof organization.reference === 'string' && organization.reference) {
    return organization.reference
  }

  return 'Not available'
}

export function getConditionRows(conditions: Record<string, unknown>[]): DetailRow[] {
  return conditions.slice(0, 8).map((condition, index) => {
    const conditionLabel =
      getOptionalString(condition.condition_text) || getOptionalCodeableConceptText(condition.code)
    const conditionCodeDetails = getConditionCodeDetails(condition)

    return {
      label: conditionLabel || `Condition ${index + 1}`,
      value:
        compactParts([
          getOptionalString(condition.clinical_status_display) ||
            getOptionalCodeableConceptText(condition.clinicalStatus),
          conditionCodeDetails,
          getOptionalDateLike(condition.recorded_date) ||
            getOptionalDateLike(condition.recordedDate) ||
            getOptionalDateLike(condition.onset_date) ||
            getOptionalDateLike(condition.onsetDateTime),
        ]) || 'No additional condition details returned.',
    }
  })
}

export function getLabRows(labs: Record<string, unknown>[]): DetailRow[] {
  return labs.slice(0, 8).map((lab, index) => ({
    label: getCodeableConceptText(lab.code) || `Lab ${index + 1}`,
    value:
      compactParts([
        getObservationValue(lab),
        getOptionalStatus(lab.status),
        getOptionalDateLike(lab.effectiveDateTime),
      ]) || 'No additional lab details returned.',
  }))
}

export function getMedicationRows(medications: Record<string, unknown>[]): DetailRow[] {
  return medications.slice(0, 8).map((medication, index) => {
    const medicationLabel =
      (typeof medication.medicationCodeableConcept === 'object' && medication.medicationCodeableConcept
        ? getCodeableConceptText(medication.medicationCodeableConcept)
        : null) ||
      (typeof medication.medicationReference === 'object' &&
      typeof (medication.medicationReference as { display?: unknown }).display === 'string'
        ? ((medication.medicationReference as { display?: string }).display ?? null)
        : null)

    return {
      label: medicationLabel || `Medication ${index + 1}`,
      value:
        compactParts([
          getOptionalStatus(medication.status),
          Array.isArray(medication.reasonCode)
            ? getOptionalCodeableConceptText(medication.reasonCode[0])
            : null,
          Array.isArray(medication.dosageInstruction)
            ? (typeof (medication.dosageInstruction[0] as { text?: unknown } | undefined)?.text === 'string'
                ? ((medication.dosageInstruction[0] as { text?: string }).text ?? null)
                : null)
            : null,
          getOptionalDateLike(medication.authoredOn),
          typeof medication.requester === 'object' &&
          typeof (medication.requester as { display?: unknown }).display === 'string'
            ? `Requester: ${(medication.requester as { display?: string }).display ?? ''}`
            : null,
        ]) || 'No additional medication details returned.',
    }
  })
}

export function getDocumentReferenceRows(documentReferences: Record<string, unknown>[]): DetailRow[] {
  return documentReferences.slice(0, 8).map((documentReference, index) => {
    const typeLabel =
      (typeof documentReference.type === 'object' && documentReference.type
        ? getCodeableConceptText(documentReference.type)
        : null) ||
      (typeof documentReference.description === 'string' ? documentReference.description : null)

    const author = Array.isArray(documentReference.author)
      ? documentReference.author.find(
          (entry) => typeof entry === 'object' && entry && typeof (entry as { display?: unknown }).display === 'string',
        )
      : null

    const attachment = Array.isArray(documentReference.content)
      ? documentReference.content.find((entry) => typeof entry === 'object' && entry)
      : null
    const attachmentContentType =
      attachment &&
      typeof (attachment as { attachment?: { contentType?: unknown } }).attachment?.contentType === 'string'
        ? ((attachment as { attachment?: { contentType?: string } }).attachment?.contentType ?? null)
        : null

    return {
      label: typeLabel || `Document ${index + 1}`,
      value:
        compactParts([
          getOptionalStatus(documentReference.status),
          typeof (author as { display?: unknown } | null)?.display === 'string'
            ? `Author: ${(author as { display?: string }).display ?? ''}`
            : null,
          typeof documentReference.date === 'string'
            ? documentReference.date
            : typeof documentReference.created === 'string'
              ? documentReference.created
              : null,
          attachmentContentType,
        ]) || 'No additional document details returned.',
    }
  })
}

export function getImagingObservationRows(observations: Record<string, unknown>[]): DetailRow[] {
  return observations.slice(0, 8).map((observation, index) => ({
    label: getCodeableConceptText(observation.code) || `Imaging observation ${index + 1}`,
    value:
      compactParts([
        getObservationValue(observation),
        getOptionalStatus(observation.status),
        typeof observation.effectiveDateTime === 'string' ? observation.effectiveDateTime : null,
      ]) || 'No additional imaging details returned.',
  }))
}

export function getImagingResultRows(results: Record<string, unknown>[]): DetailRow[] {
  return results.slice(0, 8).map((result, index) => {
    const category = Array.isArray(result.category)
      ? result.category.find((entry) => typeof entry === 'object' && entry)
      : null

    return {
      label:
        (typeof result.type === 'object' && result.type ? getCodeableConceptText(result.type) : null) ||
        (typeof result.description === 'string' ? result.description : null) ||
        `Imaging result ${index + 1}`,
      value:
        compactParts([
          getOptionalStatus(result.status),
          category && typeof category === 'object' ? getOptionalCodeableConceptText(category) : null,
          typeof result.date === 'string' ? result.date : null,
        ]) || 'No additional imaging-result details returned.',
    }
  })
}
