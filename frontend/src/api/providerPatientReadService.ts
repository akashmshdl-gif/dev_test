import axios from 'axios'
import type { CdsCard, ProviderSearchResult } from '../utils/epicSession'

type ReadProviderPatientParams = {
  token: string
  practitionerId: string
  fhirBase: string
  patientId: string
  clinicId?: string
}

type ProviderPatientCdsPrefetch = {
  patient: Record<string, unknown>
  conditions: Record<string, unknown> | null
  labs: Record<string, unknown> | null
  medicationRequests: Record<string, unknown> | null
  documentReferences: Record<string, unknown> | null
  imagingObservations: Record<string, unknown> | null
  imagingResults: Record<string, unknown> | null
}

type PatientViewRequest = {
  hookInstance: string
  hook: 'patient-view'
  fhirServer: string
  context: {
    patientId: string
    userId: string
  }
  prefetch: ProviderPatientCdsPrefetch
}

type ObservationViewRequest = {
  hookInstance: string
  hook: 'observation-view'
  fhirServer: string
  context: {
    patientId: string
    userId: string
  }
  prefetch: ProviderPatientCdsPrefetch
}

type OrderSelectRequest = {
  hookInstance: string
  hook: 'order-select'
  fhirServer: string
  context: {
    patientId: string
    userId: string
    selections: string[]
    draftOrders: {
      resourceType: 'Bundle'
      entry: Array<{
        resource: Record<string, unknown>
      }>
    }
  }
  prefetch: ProviderPatientCdsPrefetch
}

type CdsHookResponse = {
  cards?: CdsCard[]
}

type BackendPatientPrefetchResponse = {
  status?: {
    code?: number
    message?: string
  }
  patientId?: string
  clinicId?: string
  data?: {
    patient?: Record<string, unknown> | null
    conditions?: Record<string, unknown> | null
    labs?: Record<string, unknown> | null
    medicationRequests?: Record<string, unknown> | null
    documentReferences?: Record<string, unknown> | null
    imagingObservations?: Record<string, unknown> | null
    imagingResults?: Record<string, unknown> | null
    errors?: unknown[]
  }
}

const ORDER_SELECT_FALLBACK_MEDICATION_NAME = 'Demo medication starter pack'
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

function extractBundleResources(bundle: Record<string, unknown> | null, resourceType: string) {
  const entries = Array.isArray(bundle?.entry) ? bundle.entry : []

  return entries
    .map((entry) =>
      entry && typeof entry === 'object' ? (entry as { resource?: unknown }).resource : null,
    )
    .filter(
      (resource): resource is Record<string, unknown> =>
        !!resource &&
        typeof resource === 'object' &&
        !Array.isArray(resource) &&
        (resource as { resourceType?: unknown }).resourceType === resourceType,
    )
}

function extractPatientName(resource: Record<string, unknown>) {
  const names = Array.isArray(resource.name) ? resource.name : []
  const selectedName =
    names.find((name) => typeof name === 'object' && name && (name as { use?: string }).use === 'official') ??
    names.find((name) => typeof name === 'object' && name && (name as { use?: string }).use === 'usual') ??
    names[0]

  if (!selectedName || typeof selectedName !== 'object') {
    return 'Unnamed patient'
  }

  const nameText =
    typeof (selectedName as { text?: unknown }).text === 'string'
      ? ((selectedName as { text?: string }).text ?? '').trim()
      : ''

  if (nameText) {
    return nameText
  }

  const givenNames = Array.isArray((selectedName as { given?: unknown[] }).given)
    ? ((selectedName as { given?: string[] }).given ?? []).join(' ')
    : ''
  const familyValue = (selectedName as { family?: unknown }).family
  const familyName = Array.isArray(familyValue)
    ? familyValue.filter((part): part is string => typeof part === 'string').join(' ')
    : typeof familyValue === 'string'
      ? familyValue
      : ''

  return `${givenNames} ${familyName}`.trim() || 'Unnamed patient'
}

function extractMrn(resource: Record<string, unknown>) {
  const identifiers = Array.isArray(resource.identifier) ? resource.identifier : []
  const mrnIdentifier = identifiers.find((identifier) => {
    if (!identifier || typeof identifier !== 'object') {
      return false
    }

    const typeText =
      typeof (identifier as { type?: { text?: unknown } }).type?.text === 'string'
        ? (identifier as { type?: { text?: string } }).type?.text
        : ''

    return typeText === 'MRN' || typeText === 'INTERNAL' || typeText === 'Medical record number'
  })

  return typeof (mrnIdentifier as { value?: unknown } | undefined)?.value === 'string'
    ? ((mrnIdentifier as { value?: string }).value ?? null)
    : null
}

function normalizePractitionerReference(practitionerId: string) {
  const normalizedValue = practitionerId.trim()

  if (!normalizedValue) {
    return 'Practitioner/unknown'
  }

  return normalizedValue.startsWith('Practitioner/')
    ? normalizedValue
    : `Practitioner/${normalizedValue}`
}

function createHookInstance() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `patient-view-${Date.now()}`
}

function getSupplementalFailureMessage(label: string) {
  return `${label} could not be loaded.`
}

function getAxiosMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return null
  }

  const issueMessage =
    typeof error.response?.data?.issue?.[0]?.diagnostics === 'string'
      ? error.response.data.issue[0].diagnostics
      : null

  return (
    issueMessage ||
    (typeof error.response?.data?.error === 'string' ? error.response.data.error : null) ||
    (typeof error.response?.data?.status?.message === 'string'
      ? error.response.data.status.message
      : null) ||
    error.message
  )
}

function sanitizeOrderId(value: string) {
  const normalizedValue = value.trim().replace(/[^A-Za-z0-9-]+/g, '-')

  return normalizedValue || `order-${Date.now()}`
}

function getMedicationDisplayName(medication: Record<string, unknown>) {
  const medicationReference = medication.medicationReference

  if (
    medicationReference &&
    typeof medicationReference === 'object' &&
    typeof (medicationReference as { display?: unknown }).display === 'string'
  ) {
    const displayValue = ((medicationReference as { display?: string }).display ?? '').trim()

    if (displayValue) {
      return displayValue
    }
  }

  const medicationCodeableConcept = medication.medicationCodeableConcept

  if (
    medicationCodeableConcept &&
    typeof medicationCodeableConcept === 'object' &&
    typeof (medicationCodeableConcept as { text?: unknown }).text === 'string'
  ) {
    const textValue = ((medicationCodeableConcept as { text?: string }).text ?? '').trim()

    if (textValue) {
      return textValue
    }
  }

  const coding =
    medicationCodeableConcept &&
    typeof medicationCodeableConcept === 'object' &&
    Array.isArray((medicationCodeableConcept as { coding?: unknown[] }).coding)
      ? (medicationCodeableConcept as { coding?: Array<{ display?: unknown }> }).coding
      : []

  const displayCoding = coding?.find(
    (entry) => entry && typeof entry.display === 'string' && entry.display.trim(),
  )

  if (displayCoding && typeof displayCoding.display === 'string') {
    return displayCoding.display.trim()
  }

  return ORDER_SELECT_FALLBACK_MEDICATION_NAME
}

function getMedicationTimestamp(medication: Record<string, unknown>) {
  const directDateCandidates = [
    medication.authoredOn,
    medication.dateWritten,
    medication.statusChanged,
  ]

  for (const candidate of directDateCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const dateValue = new Date(candidate)

      if (!Number.isNaN(dateValue.getTime())) {
        return dateValue
      }
    }
  }

  const meta = medication.meta

  if (meta && typeof meta === 'object' && typeof (meta as { lastUpdated?: unknown }).lastUpdated === 'string') {
    const dateValue = new Date((meta as { lastUpdated?: string }).lastUpdated ?? '')

    if (!Number.isNaN(dateValue.getTime())) {
      return dateValue
    }
  }

  return null
}

function selectLatestMedication(medications: Record<string, unknown>[]) {
  if (medications.length === 0) {
    return []
  }

  const orderedMedications = [...medications].sort((left, right) => {
    const leftTime = getMedicationTimestamp(left)
    const rightTime = getMedicationTimestamp(right)
    const leftValue = leftTime ? leftTime.getTime() : 0
    const rightValue = rightTime ? rightTime.getTime() : 0

    return rightValue - leftValue
  })

  return orderedMedications.slice(0, 1)
}

function buildDraftOrderResource(
  medicationName: string,
  patientId: string,
  medicationId: string,
): Record<string, unknown> {
  return {
    resourceType: 'MedicationOrder',
    id: sanitizeOrderId(`order-${medicationId}`),
    status: 'draft',
    patient: {
      reference: `Patient/${patientId}`,
    },
    dateWritten: new Date().toISOString().slice(0, 10),
    medicationCodeableConcept: {
      text: medicationName,
    },
  }
}

function createOrderSelectRequest(params: {
  fhirBase: string
  patientId: string
  practitionerId: string
  medications: Record<string, unknown>[]
  prefetch: ProviderPatientCdsPrefetch
}) {
  const { fhirBase, patientId, practitionerId, medications, prefetch } = params
  const sourceMedications = medications.length > 0 ? selectLatestMedication(medications) : [{}]
  const draftOrders = sourceMedications.map((medication, index) => {
    const medicationName =
      medications.length > 0
        ? getMedicationDisplayName(medication)
        : `${ORDER_SELECT_FALLBACK_MEDICATION_NAME} ${index + 1}`
    const medicationId =
      typeof medication.id === 'string' && medication.id.trim()
        ? medication.id
        : `dummy-${index + 1}`
    const resource = buildDraftOrderResource(medicationName, patientId, medicationId)

    return { resource }
  })

  return {
    hookInstance: createHookInstance(),
    hook: 'order-select' as const,
    fhirServer: fhirBase,
    context: {
      patientId,
      userId: normalizePractitionerReference(practitionerId),
      selections: draftOrders.map(
        (entry) => `MedicationOrder/${String((entry.resource as { id?: unknown }).id ?? 'order')}`,
      ),
      draftOrders: {
        resourceType: 'Bundle' as const,
        entry: draftOrders,
      },
    },
    prefetch,
  }
}

export async function readProviderPatient({
  token: _token,
  practitionerId,
  fhirBase,
  patientId,
  clinicId,
}: ReadProviderPatientParams): Promise<ProviderSearchResult> {
  const normalizedPatientId = patientId.trim()

  try {
    let prefetchResponse = await apiClient.get<BackendPatientPrefetchResponse>(
      '/cds-hooks/cds-service/c-trials',
      {
        params: {
          patientId: normalizedPatientId,
          ...(clinicId ? { clinicId } : {}),
        },
      },
    )
    let prefetchData =
      prefetchResponse.data?.data && typeof prefetchResponse.data.data === 'object'
        ? prefetchResponse.data.data
        : null

    const resource =
      prefetchData?.patient && typeof prefetchData.patient === 'object'
        ? prefetchData.patient
        : { resourceType: 'Patient', id: normalizedPatientId }

    const conditionBundle =
      prefetchData?.conditions && typeof prefetchData.conditions === 'object'
        ? prefetchData.conditions
        : null
    const labBundle =
      prefetchData?.labs && typeof prefetchData.labs === 'object' ? prefetchData.labs : null
    const medicationBundle =
      prefetchData?.medicationRequests && typeof prefetchData.medicationRequests === 'object'
        ? prefetchData.medicationRequests
        : null
    const enrichedDocumentReferenceBundle =
      prefetchData?.documentReferences && typeof prefetchData.documentReferences === 'object'
        ? prefetchData.documentReferences
        : null
    const imagingObservationBundle =
      prefetchData?.imagingObservations && typeof prefetchData.imagingObservations === 'object'
        ? prefetchData.imagingObservations
        : null
    const enrichedImagingResultBundle =
      prefetchData?.imagingResults && typeof prefetchData.imagingResults === 'object'
        ? prefetchData.imagingResults
        : null
    const supplementalErrors = Array.isArray(prefetchData?.errors)
      ? prefetchData.errors.map((entry) => {
          if (typeof entry === 'string' && entry.trim()) {
            return entry.trim()
          }

          if (
            entry &&
            typeof entry === 'object' &&
            Array.isArray((entry as { issue?: unknown[] }).issue) &&
            typeof ((entry as { issue?: Array<{ diagnostics?: unknown }> }).issue?.[0]?.diagnostics) ===
              'string'
          ) {
            return String(
              (entry as { issue?: Array<{ diagnostics?: string }> }).issue?.[0]?.diagnostics ?? '',
            ).trim()
          }

          return 'Epic returned an additional prefetch warning.'
        })
      : []

    const conditions = extractBundleResources(conditionBundle, 'Condition')
    const labs = extractBundleResources(labBundle, 'Observation')
    const medications = extractBundleResources(medicationBundle, 'MedicationRequest')
    const documentReferences = extractBundleResources(
      enrichedDocumentReferenceBundle,
      'DocumentReference',
    )
    const imagingObservations = extractBundleResources(imagingObservationBundle, 'Observation')
    const imagingResults = extractBundleResources(
      enrichedImagingResultBundle,
      'DocumentReference',
    )
    const cdsPrefetch: ProviderPatientCdsPrefetch = {
      patient: resource,
      conditions: conditionBundle,
      labs: labBundle,
      medicationRequests: medicationBundle,
      documentReferences: enrichedDocumentReferenceBundle,
      imagingObservations: imagingObservationBundle,
      imagingResults: enrichedImagingResultBundle,
    }

    const cdsRequest: PatientViewRequest = {
      hookInstance: createHookInstance(),
      hook: 'patient-view',
      fhirServer: fhirBase,
      context: {
        patientId: normalizedPatientId,
        userId: normalizePractitionerReference(practitionerId),
      },
      prefetch: cdsPrefetch,
    }
    const observationViewRequest: ObservationViewRequest = {
      hookInstance: createHookInstance(),
      hook: 'observation-view',
      fhirServer: fhirBase,
      context: {
        patientId: normalizedPatientId,
        userId: normalizePractitionerReference(practitionerId),
      },
      prefetch: cdsPrefetch,
    }

    let patientViewCdsCards: CdsCard[] = []
    let patientViewCdsResponsePayload: Record<string, unknown> | null = null

    try {
      const cdsResponse = await apiClient.post<CdsHookResponse>('/cds-hooks/cds-service/patient-view', cdsRequest)

      patientViewCdsCards = Array.isArray(cdsResponse.data.cards) ? cdsResponse.data.cards : []
      patientViewCdsResponsePayload =
        cdsResponse.data && typeof cdsResponse.data === 'object'
          ? (cdsResponse.data as unknown as Record<string, unknown>)
          : null
    } catch (error) {
      const cdsMessage = getAxiosMessage(error)

      supplementalErrors.push(cdsMessage || getSupplementalFailureMessage('CDS alerts'))
    }

    let observationViewCdsCards: CdsCard[] = []
    let observationViewCdsResponsePayload: Record<string, unknown> | null = null

    try {
      const observationViewResponse = await apiClient.post<CdsHookResponse>(
        '/cds-hooks/cds-service/observation-view',
        observationViewRequest,
      )

      observationViewCdsCards = Array.isArray(observationViewResponse.data.cards)
        ? observationViewResponse.data.cards
        : []
      observationViewCdsResponsePayload =
        observationViewResponse.data && typeof observationViewResponse.data === 'object'
          ? (observationViewResponse.data as unknown as Record<string, unknown>)
          : null
    } catch (error) {
      const cdsMessage = getAxiosMessage(error)

      supplementalErrors.push(cdsMessage || getSupplementalFailureMessage('Observation CDS alerts'))
    }

    const orderSelectRequest: OrderSelectRequest = createOrderSelectRequest({
      fhirBase,
      patientId: normalizedPatientId,
      practitionerId,
      medications,
      prefetch: cdsPrefetch,
    })

    let orderSelectCdsCards: CdsCard[] = []
    let orderSelectCdsResponsePayload: Record<string, unknown> | null = null

    try {
      const orderSelectResponse = await apiClient.post<CdsHookResponse>(
        '/cds-hooks/cds-service/order-select',
        orderSelectRequest,
      )

      orderSelectCdsCards = Array.isArray(orderSelectResponse.data.cards)
        ? orderSelectResponse.data.cards
        : []
      orderSelectCdsResponsePayload =
        orderSelectResponse.data && typeof orderSelectResponse.data === 'object'
          ? (orderSelectResponse.data as unknown as Record<string, unknown>)
          : null
    } catch (error) {
      const cdsMessage = getAxiosMessage(error)

      supplementalErrors.push(cdsMessage || getSupplementalFailureMessage('Order-select CDS alerts'))
    }

    const combinedCdsCards = [
      ...patientViewCdsCards,
      ...observationViewCdsCards,
      ...orderSelectCdsCards,
    ]
    const combinedCdsRequest = {
      patientView: cdsRequest,
      observationView: observationViewRequest,
      orderSelect: orderSelectRequest,
    }
    const combinedCdsResponse = {
      patientView: patientViewCdsResponsePayload,
      observationView: observationViewCdsResponsePayload,
      orderSelect: orderSelectCdsResponsePayload,
    }

    return {
      id: typeof resource.id === 'string' ? resource.id : normalizedPatientId,
      name: extractPatientName(resource),
      birthDate: typeof resource.birthDate === 'string' ? resource.birthDate : null,
      gender: typeof resource.gender === 'string' ? resource.gender : null,
      active: typeof resource.active === 'boolean' ? resource.active : null,
      mrn: extractMrn(resource),
      resource,
      conditions,
      labs,
      medications,
      documentReferences,
      imagingObservations,
      imagingResults,
      conditionBundle,
      labBundle,
      rawPatientData: resource,
      cdsCards: combinedCdsCards,
      cdsRequest: combinedCdsRequest as Record<string, unknown>,
      cdsResponse: combinedCdsResponse as Record<string, unknown>,
      patientViewCdsCards,
      patientViewCdsRequest: cdsRequest as unknown as Record<string, unknown>,
      patientViewCdsResponse: patientViewCdsResponsePayload,
      observationViewCdsCards,
      observationViewCdsRequest: observationViewRequest as unknown as Record<string, unknown>,
      observationViewCdsResponse: observationViewCdsResponsePayload,
      orderSelectCdsCards,
      orderSelectCdsRequest: orderSelectRequest as unknown as Record<string, unknown>,
      orderSelectCdsResponse: orderSelectCdsResponsePayload,
      medicationBundle,
      documentReferenceBundle: enrichedDocumentReferenceBundle,
      imagingObservationBundle,
      imagingResultBundle: enrichedImagingResultBundle,
      supplementalErrors,
    }
  } catch (error) {
    const message = getAxiosMessage(error)

    if (message) {
      throw new Error(message || 'Unable to read the Epic patient.')
    }

    throw new Error('Unable to read the Epic patient.')
  }
}
