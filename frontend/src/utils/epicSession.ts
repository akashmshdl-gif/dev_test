export type AuthType = 'patient' | 'provider'

export type EpicSessionData = Record<string, unknown> & {
  authType?: AuthType
  instanceKey?: string
  patientId?: string
  practitionerId?: string
}

export type CdsCardLink = {
  label: string
  url: string
  type: 'absolute' | 'smart'
  appContext?: string
  autolaunchable?: boolean
}

export type CdsCard = {
  uuid: string
  summary: string
  indicator: string
  source?: {
    label?: string
  }
  detail?: string
  links?: CdsCardLink[]
}

export type ProviderSearchResult = {
  id: string
  name: string
  birthDate: string | null
  gender: string | null
  active: boolean | null
  mrn: string | null
  resource: Record<string, unknown>
  conditions: Record<string, unknown>[]
  labs: Record<string, unknown>[]
  medications: Record<string, unknown>[]
  documentReferences: Record<string, unknown>[]
  imagingObservations: Record<string, unknown>[]
  imagingResults: Record<string, unknown>[]
  conditionBundle: unknown
  labBundle: unknown
  rawPatientData: Record<string, unknown> | null
  cdsCards: CdsCard[]
  cdsRequest: Record<string, unknown> | null
  cdsResponse: Record<string, unknown> | null
  patientViewCdsCards: CdsCard[]
  patientViewCdsRequest: Record<string, unknown> | null
  patientViewCdsResponse: Record<string, unknown> | null
  observationViewCdsCards: CdsCard[]
  observationViewCdsRequest: Record<string, unknown> | null
  observationViewCdsResponse: Record<string, unknown> | null
  orderSelectCdsCards: CdsCard[]
  orderSelectCdsRequest: Record<string, unknown> | null
  orderSelectCdsResponse: Record<string, unknown> | null
  medicationBundle: Record<string, unknown> | null
  documentReferenceBundle: Record<string, unknown> | null
  imagingObservationBundle: Record<string, unknown> | null
  imagingResultBundle: Record<string, unknown> | null
  supplementalErrors?: string[]
}

const structuredValuePattern = /^[[{]/
const EPIC_SESSION_STORAGE_KEY = 'epic-session'
const EPIC_SELECTED_PATIENT_STORAGE_KEY = 'epic-selected-patient'
const EPIC_INSTANCE_QUERY_PARAM = 'instanceKey'
const EPIC_SESSION_QUERY_KEYS = new Set([
  'authType',
  'data',
  'fhirBase',
  'patientId',
  'practitionerId',
  'smartError',
  'token',
])

function isStructured(value: string) {
  return structuredValuePattern.test(value.trim())
}

function tryParseJson(value: string): unknown {
  const attempts = [value]

  try {
    const decodedValue = decodeURIComponent(value)

    if (decodedValue !== value) {
      attempts.push(decodedValue)
    }
  } catch {
    // Ignore malformed encoding and fall back to the original string.
  }

  for (const candidate of attempts) {
    if (!isStructured(candidate)) {
      continue
    }

    try {
      return JSON.parse(candidate)
    } catch {
      // Continue to the next candidate.
    }
  }

  return value
}

function inferAuthType(session: Record<string, unknown>): AuthType {
  if (session.authType === 'patient' || session.authType === 'provider') {
    return session.authType
  }

  if (typeof session.patientId === 'string' && session.patientId) {
    return 'patient'
  }

  return 'provider'
}

function normalizeSession(session: Record<string, unknown>): EpicSessionData {
  return {
    ...session,
    authType: inferAuthType(session),
  }
}

function getWindowSearch() {
  return typeof window === 'undefined' ? '' : window.location.search
}

function getLaunchContextInstanceKey(session: Record<string, unknown>) {
  const launchContext = session.launchContext

  if (launchContext && typeof launchContext === 'object' && !Array.isArray(launchContext)) {
    const state = (launchContext as Record<string, unknown>).state

    if (typeof state === 'string' && state.trim()) {
      return state.trim()
    }
  }

  return ''
}

export function getEpicInstanceKey(search = getWindowSearch()) {
  if (!search || search === '?') {
    return ''
  }

  const params = new URLSearchParams(search)
  const instanceKey = params.get(EPIC_INSTANCE_QUERY_PARAM) || params.get('state') || ''

  return instanceKey.trim()
}

function getSessionInstanceKey(session: Record<string, unknown>) {
  if (typeof session.instanceKey === 'string' && session.instanceKey.trim()) {
    return session.instanceKey.trim()
  }

  return getLaunchContextInstanceKey(session)
}

function getScopedStorageKey(baseKey: string, instanceKey = getEpicInstanceKey()) {
  return instanceKey ? `${baseKey}:${instanceKey}` : baseKey
}

function hasSessionPayload(params: URLSearchParams) {
  let hasPayload = false

  params.forEach((_, key) => {
    if (EPIC_SESSION_QUERY_KEYS.has(key)) {
      hasPayload = true
    }
  })

  return hasPayload
}

export function parseEpicSession(search: string): EpicSessionData | null {
  if (!search || search === '?') {
    return null
  }

  const params = new URLSearchParams(search)

  if (!hasSessionPayload(params)) {
    return null
  }

  const session: Record<string, unknown> = {}
  const dataParam = params.get('data')

  if (dataParam) {
    const parsedData = tryParseJson(dataParam)

    if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      Object.assign(session, parsedData as Record<string, unknown>)
    } else {
      session.data = parsedData
    }
  }

  params.forEach((value, key) => {
    if (key === 'data') {
      return
    }

    session[key] = tryParseJson(value)
  })

  const instanceKey = getEpicInstanceKey(search) || getSessionInstanceKey(session)

  if (instanceKey) {
    session.instanceKey = instanceKey
  }

  return Object.keys(session).length > 0 ? normalizeSession(session) : null
}

export function storeEpicSession(session: EpicSessionData) {
  const instanceKey = getSessionInstanceKey(session) || getEpicInstanceKey()
  const sessionToStore = instanceKey ? { ...session, instanceKey } : session

  sessionStorage.setItem(getScopedStorageKey(EPIC_SESSION_STORAGE_KEY, instanceKey), JSON.stringify(sessionToStore))
}

export function getStoredEpicSession(instanceKey = getEpicInstanceKey()) {
  const scopedStoredValue = sessionStorage.getItem(getScopedStorageKey(EPIC_SESSION_STORAGE_KEY, instanceKey))
  const storedValue = scopedStoredValue || (!instanceKey ? null : sessionStorage.getItem(EPIC_SESSION_STORAGE_KEY))

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return null
    }

    return normalizeSession(parsedValue as Record<string, unknown>)
  } catch {
    return null
  }
}

export function storeSelectedPatient(patient: ProviderSearchResult) {
  sessionStorage.setItem(getScopedStorageKey(EPIC_SELECTED_PATIENT_STORAGE_KEY), JSON.stringify(patient))
}

export function getStoredSelectedPatient() {
  const instanceKey = getEpicInstanceKey()
  const scopedStoredValue = sessionStorage.getItem(getScopedStorageKey(EPIC_SELECTED_PATIENT_STORAGE_KEY, instanceKey))
  const storedValue =
    scopedStoredValue || (!instanceKey ? null : sessionStorage.getItem(EPIC_SELECTED_PATIENT_STORAGE_KEY))

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue)

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return null
    }

    return parsedValue as ProviderSearchResult
  } catch {
    return null
  }
}

export function clearEpicSessionStorage() {
  const instanceKey = getEpicInstanceKey()

  sessionStorage.removeItem(getScopedStorageKey(EPIC_SESSION_STORAGE_KEY, instanceKey))
  sessionStorage.removeItem(getScopedStorageKey(EPIC_SELECTED_PATIENT_STORAGE_KEY, instanceKey))

  if (!instanceKey) {
    sessionStorage.removeItem(EPIC_SESSION_STORAGE_KEY)
    sessionStorage.removeItem(EPIC_SELECTED_PATIENT_STORAGE_KEY)
  }
}

export function clearStoredSelectedPatient() {
  sessionStorage.removeItem(getScopedStorageKey(EPIC_SELECTED_PATIENT_STORAGE_KEY))
}

export function getSessionDashboardPath(session: EpicSessionData) {
  return inferAuthType(session) === 'patient' ? '/patient-dashboard' : '/provider-dashboard'
}

export function getAccessToken(session: EpicSessionData) {
  if (typeof session.token === 'string' && session.token) {
    return session.token
  }

  const tokenData = session.token

  if (tokenData && typeof tokenData === 'object' && !Array.isArray(tokenData)) {
    const accessToken = (tokenData as Record<string, unknown>).access_token

    if (typeof accessToken === 'string' && accessToken) {
      return accessToken
    }
  }

  return ''
}

export function getFhirBase(session: EpicSessionData) {
  if (typeof session.fhirBase === 'string' && session.fhirBase) {
    return session.fhirBase
  }

  return ''
}

export function extractPatientResource(session: EpicSessionData) {
  if (session.patient && typeof session.patient === 'object' && !Array.isArray(session.patient)) {
    const patientData = (session.patient as Record<string, unknown>).data

    if (patientData && typeof patientData === 'object' && !Array.isArray(patientData)) {
      return patientData as Record<string, unknown>
    }
  }

  return null
}

export function extractPractitionerResource(session: EpicSessionData) {
  if (
    session.practitioner &&
    typeof session.practitioner === 'object' &&
    !Array.isArray(session.practitioner)
  ) {
    const practitionerData = (session.practitioner as Record<string, unknown>).data

    if (practitionerData && typeof practitionerData === 'object' && !Array.isArray(practitionerData)) {
      return practitionerData as Record<string, unknown>
    }
  }

  return null
}

export function formatHumanName(resource: Record<string, unknown> | null) {
  const names = Array.isArray(resource?.name) ? resource.name : []
  const selectedName =
    names.find((name) => typeof name === 'object' && name && (name as { use?: string }).use === 'official') ??
    names.find((name) => typeof name === 'object' && name && (name as { use?: string }).use === 'usual') ??
    names[0]

  if (!selectedName || typeof selectedName !== 'object') {
    return 'Not available'
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
  const fullName = `${givenNames} ${familyName}`.trim()

  return fullName || 'Not available'
}
