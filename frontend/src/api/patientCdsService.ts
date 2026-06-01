import axios from 'axios'
import type { CdsCard } from '../utils/epicSession'

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

type PatientCdsPrefetch = {
  patient: Record<string, unknown>
  conditions: Record<string, unknown> | null
  labs: Record<string, unknown> | null
  medicationRequests: Record<string, unknown> | null
  documentReferences: Record<string, unknown> | null
  imagingObservations: Record<string, unknown> | null
  imagingResults: Record<string, unknown> | null
}

type PatientViewCdsResult = {
  cards: CdsCard[]
  prefetch: PatientCdsPrefetch | null
  errors: string[]
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

function createHookInstance() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `patient-view-${Date.now()}`
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

/**
 * Fetches patient prefetch data from the backend and calls the CDS
 * patient-view service to get clinical trial cards.
 *
 * Can be called from both the Provider Dashboard and Patient Dashboard —
 * the only required parameter is the patient FHIR id.
 */
export async function fetchPatientViewCdsCards(params: {
  patientId: string
  fhirBase?: string
  userId?: string
  clinicId?: string
}): Promise<PatientViewCdsResult> {
  const { patientId, fhirBase, userId, clinicId } = params
  const errors: string[] = []
  let prefetch: PatientCdsPrefetch | null = null
  let cards: CdsCard[] = []

  // Step 1: Fetch prefetch data from the backend
  try {
    let prefetchResponse = await apiClient.get<BackendPatientPrefetchResponse>(
      '/cds-hooks/cds-service/c-trials',
      {
        params: {
          patientId,
          ...(clinicId ? { clinicId } : {}),
        },
      },
    )

    let prefetchData =
      prefetchResponse.data?.data && typeof prefetchResponse.data.data === 'object'
        ? prefetchResponse.data.data
        : null

    const patient =
      prefetchData?.patient && typeof prefetchData.patient === 'object'
        ? prefetchData.patient
        : { resourceType: 'Patient', id: patientId }

    prefetch = {
      patient,
      conditions: prefetchData?.conditions ?? null,
      labs: prefetchData?.labs ?? null,
      medicationRequests: prefetchData?.medicationRequests ?? null,
      documentReferences: prefetchData?.documentReferences ?? null,
      imagingObservations: prefetchData?.imagingObservations ?? null,
      imagingResults: prefetchData?.imagingResults ?? null,
    }

    if (Array.isArray(prefetchData?.errors)) {
      prefetchData.errors.forEach((entry) => {
        if (typeof entry === 'string' && entry.trim()) {
          errors.push(entry.trim())
        }
      })
    }
  } catch (error) {
    const message = getAxiosMessage(error)
    errors.push(message || 'Failed to fetch patient prefetch data.')
    return { cards, prefetch, errors }
  }

  // Step 2: Call CDS patient-view with the prefetch data
  try {
    const cdsRequest = {
      hookInstance: createHookInstance(),
      hook: 'patient-view',
      fhirServer: fhirBase || '',
      context: {
        patientId,
        userId: userId || `Patient/${patientId}`,
      },
      prefetch,
    }

    const cdsResponse = await apiClient.post<CdsHookResponse>(
      '/cds-hooks/cds-service/patient-view',
      cdsRequest,
    )

    cards = Array.isArray(cdsResponse.data.cards) ? cdsResponse.data.cards : []
  } catch (error) {
    const message = getAxiosMessage(error)
    errors.push(message || 'Failed to fetch CDS patient-view cards.')
  }

  return { cards, prefetch, errors }
}
