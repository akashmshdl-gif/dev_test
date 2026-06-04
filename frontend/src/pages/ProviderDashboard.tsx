import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CdsHooksCard from '../components/CdsHooksCard'
import ClinicalTrialMatchCard from '../components/ClinicalTrialMatchCard'
import DataCard from '../components/DataCard'
import { ClinicalTrialDetailView } from './ClinicalTrialDetailPage'
import { ClinicalTrialMatchesView } from './ClinicalTrialMatchesPage'
import { ClinicalTrialReferralView } from './ClinicalTrialReferralPage'
import { readProviderPatient } from '../api/providerPatientReadService'
import { fetchPatientViewCdsCards } from '../api/patientCdsService'
import { useEpicSession } from '../hooks/useEpicSession'
import { type CdsTrialCard, isCdsTrialCard } from '../data/mockClinicalTrials'
import {
  getConditionRows,
  getDocumentReferenceRows,
  getImagingObservationRows,
  getImagingResultRows,
  getLabRows,
  getManagingOrganization,
  getMedicationRows,
  getPrimaryAddress,
  getPrimaryCareProvider,
  getPrimaryContacts,
} from '../utils/patientResourceFormatting'
import {
  clearStoredSelectedPatient,
  extractPatientResource,
  extractPractitionerResource,
  formatHumanName,
  getAccessToken,
  getFhirBase,
  type CdsCard,
  type ProviderSearchResult,
} from '../utils/epicSession'

type ProviderSectionId =
  | 'alerts'
  | 'overview'
  | 'labs'
  | 'conditions'
  | 'medications'
  | 'documents'
  | 'imaging'
  | 'imagingResults'
  | 'raw'

type AlertColumnKey = 'critical' | 'warning' | 'information'

type IdentifierMatcher = {
  codes?: string[]
  texts?: string[]
  systems?: string[]
}

type ClinicalTrialRouteView = 'matches' | 'detail' | 'refer' | null

function getInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0 || name === 'Not available') {
    return 'PR'
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

function UlaloLogo() {
  return (
    <svg
      className="ulalo-logo"
      viewBox="0 0 125 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M79.212 26.9735L68.2991 2.72913L61.884 2.74061L74.284 32.3622L79.212 26.9735Z"
        fill="url(#paint0_linear_provider_dashboard)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.9329 26.8459L61.6871 2.72913L68.1022 2.74061L55.3841 32.2982L50.9329 26.8459Z"
        fill="url(#paint1_linear_provider_dashboard)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.9329 26.8292L55.3841 32.2817H74.143L71.8638 26.8292H50.9329Z"
        fill="url(#paint2_linear_provider_dashboard)"
      />
      <path
        d="M34.9073 29.3369H45.2989V32.4974H31.0318V2.72913H34.9073V29.3369ZM5.52762 2.72913V21.5638C5.52762 24.2118 6.17353 26.1764 7.46539 27.4576C8.75724 28.739 10.553 29.3796 12.8528 29.3796C15.1241 29.3796 16.9057 28.739 18.1976 27.4576C19.4895 26.1764 20.1354 24.2118 20.1354 21.5638V2.72913H24.0109V21.5211C24.0109 23.9982 23.514 26.0839 22.5203 27.778C21.5266 29.4721 20.185 30.732 18.4957 31.5577C16.8064 32.3836 14.9112 32.7963 12.8102 32.7963C10.7092 32.7963 8.81399 32.3836 7.12468 31.5577C5.43531 30.732 4.10093 29.4721 3.12138 27.778C2.14186 26.0839 1.6521 23.9982 1.6521 21.5211V2.72913H5.52762Z"
        fill="white"
      />
      <path
        d="M102.702 16.7926C102.702 11.8953 103.496 8.07279 105.087 5.32515C106.676 2.57755 109.459 1.20374 113.434 1.20374C117.38 1.20374 120.148 2.57755 121.738 5.32515C123.329 8.07279 124.123 11.8953 124.123 16.7926C124.123 21.7753 123.329 25.6476 121.738 28.4095C120.148 31.1713 117.38 32.5522 113.434 32.5522C109.459 32.5522 106.676 31.1713 105.087 28.4095C103.496 25.6476 102.702 21.7753 102.702 16.7926ZM120.29 16.7926C120.29 14.3154 120.127 12.2156 119.801 10.493C119.474 8.77034 118.807 7.38231 117.799 6.32881C116.791 5.27535 115.336 4.7486 113.434 4.7486C111.503 4.7486 110.034 5.27535 109.026 6.32881C108.018 7.38234 107.351 8.77034 107.024 10.493C106.698 12.2156 106.534 14.3154 106.534 16.7926C106.534 19.3551 106.698 21.5048 107.024 23.2416C107.351 24.9785 108.018 26.3736 109.026 27.4271C110.034 28.4806 111.503 29.0073 113.434 29.0073C115.336 29.0073 116.791 28.4806 117.799 27.4271C118.807 26.3736 119.474 24.9785 119.801 23.2416C120.127 21.5048 120.29 19.3551 120.29 16.7926ZM88.2702 29.3917H98.6618V32.5522H84.3947V2.78397H88.2702V29.3917Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_provider_dashboard"
          x1="70.5479"
          y1="32.3622"
          x2="70.5479"
          y2="2.72913"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8DF3B2" />
          <stop offset="1" stopColor="#1BE866" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_provider_dashboard"
          x1="59.5174"
          y1="32.2982"
          x2="59.5174"
          y2="2.72913"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1BE866" />
          <stop offset="1" stopColor="#8DF3B2" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_provider_dashboard"
          x1="50.9329"
          y1="26.8292"
          x2="74.143"
          y2="26.8292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8DF3B2" />
          <stop offset="1" stopColor="#1BE866" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function getAlertColumnKey(indicator: string | undefined): AlertColumnKey {
  if (indicator === 'critical') {
    return 'critical'
  }

  if (indicator === 'warning') {
    return 'warning'
  }

  return 'information'
}

function getClinicalTrialRouteView(pathname: string): ClinicalTrialRouteView {
  if (pathname.includes('/provider-dashboard/trial-matches/')) {
    return 'detail'
  }

  if (pathname.endsWith('/provider-dashboard/trial-matches')) {
    return 'matches'
  }

  if (pathname.endsWith('/provider-dashboard/refer-coordinator')) {
    return 'refer'
  }

  return null
}

function isEmbeddedClinicalTrialLaunchCard(card: CdsCard) {
  if (card.summary === 'Clinical Trial Matches Available') {
    return true
  }

  if (typeof card.detail === 'string' && card.detail.includes('Review real-time clinical trial matches')) {
    return true
  }

  return Array.isArray(card.links)
    ? card.links.some((link) => link.label === 'Open SMART on FHIR app')
    : false
}

function getDefaultProviderSection(hasSmartPatientContext: boolean): ProviderSectionId {
  return hasSmartPatientContext ? 'alerts' : 'overview'
}

function getIdentifierSearchTerms(identifier: Record<string, unknown>) {
  const type = identifier.type

  if (!type || typeof type !== 'object') {
    return []
  }

  const terms: string[] = []
  const typeText = (type as { text?: unknown }).text

  if (typeof typeText === 'string' && typeText.trim()) {
    terms.push(typeText.trim().toLowerCase())
  }

  const coding = Array.isArray((type as { coding?: unknown[] }).coding)
    ? ((type as { coding?: Array<{ code?: unknown; display?: unknown }> }).coding ?? [])
    : []

  coding.forEach((entry) => {
    if (typeof entry.code === 'string' && entry.code.trim()) {
      terms.push(entry.code.trim().toLowerCase())
    }

    if (typeof entry.display === 'string' && entry.display.trim()) {
      terms.push(entry.display.trim().toLowerCase())
    }
  })

  return terms
}

function getPatientIdentifierValue(resource: Record<string, unknown> | null, matcher: IdentifierMatcher) {
  const identifiers = Array.isArray(resource?.identifier) ? resource.identifier : []
  const normalizedCodes = (matcher.codes ?? []).map((value) => value.toLowerCase())
  const normalizedTexts = (matcher.texts ?? []).map((value) => value.toLowerCase())
  const normalizedSystems = (matcher.systems ?? []).map((value) => value.toLowerCase())

  const identifier = identifiers.find((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false
    }

    const candidate = entry as Record<string, unknown>
    const searchTerms = getIdentifierSearchTerms(candidate)
    const system =
      typeof candidate.system === 'string' && candidate.system.trim()
        ? candidate.system.trim().toLowerCase()
        : ''

    const matchesCode = normalizedCodes.some((value) => searchTerms.includes(value))
    const matchesText = normalizedTexts.some((value) => searchTerms.includes(value))
    const matchesSystem = normalizedSystems.includes(system)

    return matchesCode || matchesText || matchesSystem
  })

  return typeof (identifier as { value?: unknown } | undefined)?.value === 'string'
    ? (((identifier as { value?: string }).value ?? '').trim() || 'Not available')
    : 'Not available'
}

function getPatientExtensionValue(resource: Record<string, unknown> | null, url: string) {
  const extensions = Array.isArray(resource?.extension) ? resource.extension : []
  const extension = extensions.find(
    (entry) => typeof entry === 'object' && entry && (entry as { url?: string }).url === url,
  )

  if (!extension || typeof extension !== 'object') {
    return 'Not available'
  }

  if (typeof (extension as { valueString?: unknown }).valueString === 'string') {
    const value = ((extension as { valueString?: string }).valueString ?? '').trim()

    if (value) {
      return value
    }
  }

  if (typeof (extension as { valueCode?: unknown }).valueCode === 'string') {
    const value = ((extension as { valueCode?: string }).valueCode ?? '').trim()

    if (value) {
      return value
    }
  }

  const nestedExtensions = Array.isArray((extension as { extension?: unknown[] }).extension)
    ? ((extension as { extension?: Array<{ url?: unknown; valueString?: unknown; valueCoding?: unknown }> })
        .extension ?? [])
    : []

  const textExtension = nestedExtensions.find(
    (entry) => entry && typeof entry.url === 'string' && entry.url === 'text',
  )

  if (textExtension && typeof textExtension.valueString === 'string' && textExtension.valueString.trim()) {
    return textExtension.valueString.trim()
  }

  const ombExtension = nestedExtensions.find(
    (entry) => entry && typeof entry.url === 'string' && entry.url === 'ombCategory',
  )

  if (
    ombExtension &&
    ombExtension.valueCoding &&
    typeof ombExtension.valueCoding === 'object' &&
    typeof (ombExtension.valueCoding as { display?: unknown }).display === 'string'
  ) {
    const display = ((ombExtension.valueCoding as { display?: string }).display ?? '').trim()

    if (display) {
      return display
    }
  }

  return 'Not available'
}

function getPreferredLanguage(resource: Record<string, unknown> | null) {
  const communications = Array.isArray(resource?.communication) ? resource.communication : []
  const primaryCommunication = communications[0]

  if (!primaryCommunication || typeof primaryCommunication !== 'object') {
    return 'Not available'
  }

  const language = (primaryCommunication as { language?: unknown }).language

  if (!language || typeof language !== 'object') {
    return 'Not available'
  }

  if (typeof (language as { text?: unknown }).text === 'string' && (language as { text?: string }).text?.trim()) {
    return (language as { text?: string }).text?.trim() ?? 'Not available'
  }

  const coding = Array.isArray((language as { coding?: unknown[] }).coding)
    ? ((language as { coding?: Array<{ display?: unknown; code?: unknown }> }).coding ?? [])
    : []
  const primaryCoding = coding.find(
    (entry) =>
      entry &&
      ((typeof entry.display === 'string' && entry.display.trim()) ||
        (typeof entry.code === 'string' && entry.code.trim())),
  )

  if (!primaryCoding) {
    return 'Not available'
  }

  if (typeof primaryCoding.display === 'string' && primaryCoding.display.trim()) {
    return primaryCoding.display.trim()
  }

  return typeof primaryCoding.code === 'string' && primaryCoding.code.trim()
    ? primaryCoding.code.trim()
    : 'Not available'
}

function getMaritalStatus(resource: Record<string, unknown> | null) {
  const maritalStatus = resource?.maritalStatus

  if (!maritalStatus || typeof maritalStatus !== 'object') {
    return 'Not available'
  }

  if (
    typeof (maritalStatus as { text?: unknown }).text === 'string' &&
    (maritalStatus as { text?: string }).text?.trim()
  ) {
    return (maritalStatus as { text?: string }).text?.trim() ?? 'Not available'
  }

  const coding = Array.isArray((maritalStatus as { coding?: unknown[] }).coding)
    ? ((maritalStatus as { coding?: Array<{ display?: unknown; code?: unknown }> }).coding ?? [])
    : []
  const primaryCoding = coding.find(
    (entry) =>
      entry &&
      ((typeof entry.display === 'string' && entry.display.trim()) ||
        (typeof entry.code === 'string' && entry.code.trim())),
  )

  if (!primaryCoding) {
    return 'Not available'
  }

  if (typeof primaryCoding.display === 'string' && primaryCoding.display.trim()) {
    return primaryCoding.display.trim()
  }

  return typeof primaryCoding.code === 'string' && primaryCoding.code.trim()
    ? primaryCoding.code.trim()
    : 'Not available'
}

function ProviderDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, clearSession, instanceKey } = useEpicSession()
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const autoLoadedPatientIdRef = useRef('')
  const [patientIdInput, setPatientIdInput] = useState(
    typeof session?.patientId === 'string' ? session.patientId : '',
  )
  const [lookupError, setLookupError] = useState('')
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [patientResult, setPatientResult] = useState<ProviderSearchResult | null>(null)
  const [selectedSection, setSelectedSection] = useState<ProviderSectionId>(
    getDefaultProviderSection(typeof session?.patientId === 'string' && Boolean(session.patientId.trim())),
  )
  const [dismissedCardIds, setDismissedCardIds] = useState<string[]>([])
  const [isClinicalTrialCardDismissed, setIsClinicalTrialCardDismissed] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [independentTrialCards, setIndependentTrialCards] = useState<CdsTrialCard[]>([])
  const lastIndependentTrialPatientIdRef = useRef('')
  const instanceSearch = instanceKey ? `?instanceKey=${encodeURIComponent(instanceKey)}` : ''

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }

    if (session.authType === 'patient') {
      navigate(`/patient-dashboard${instanceSearch}`, { replace: true })
      return
    }

    clearStoredSelectedPatient()
  }, [instanceSearch, navigate, session])

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isProfileMenuOpen])

  const practitioner = session ? extractPractitionerResource(session) : null
  const providerName = formatHumanName(practitioner)
  const providerInitials = getInitials(providerName)
  const accessToken = session ? getAccessToken(session) : ''
  const fhirBase = session ? getFhirBase(session) : ''
  const practitionerId = typeof session?.practitionerId === 'string' ? session.practitionerId : ''
  const smartPatientId = typeof session?.patientId === 'string' ? session.patientId.trim() : ''
  const canLoadPatient = Boolean(accessToken && fhirBase && practitionerId)
  const shouldAttemptSmartAutoLoad = Boolean(smartPatientId && canLoadPatient)
  const sessionPatientResource = session ? extractPatientResource(session) : null
  const hasSessionPatientContext = Boolean(sessionPatientResource)
  const shouldHideSearchPanel = Boolean(
    smartPatientId &&
      (patientResult || hasSessionPatientContext || (shouldAttemptSmartAutoLoad && !lookupError)),
  )
  const shouldShowAutoLoadingState = Boolean(
    shouldAttemptSmartAutoLoad && !lookupError && !patientResult && !hasSessionPatientContext,
  )
  const clinicalTrialRouteView = getClinicalTrialRouteView(location.pathname)
  const isClinicalTrialFlowActive = clinicalTrialRouteView !== null
  const displayedPatientResource = patientResult?.resource ?? sessionPatientResource ?? null
  const displayedPatientName = patientResult?.name || formatHumanName(displayedPatientResource)
  const displayedPatientId =
    patientResult?.id ||
    (typeof displayedPatientResource?.id === 'string' ? displayedPatientResource.id : smartPatientId || 'Not available')
  const displayedPatientBirthDate =
    patientResult?.birthDate ||
    (typeof displayedPatientResource?.birthDate === 'string' ? displayedPatientResource.birthDate : 'Not available')
  const displayedPatientGender =
    patientResult?.gender ||
    (typeof displayedPatientResource?.gender === 'string' ? displayedPatientResource.gender : 'Not available')
  const displayedPatientMrn =
    patientResult?.mrn ||
    getPatientIdentifierValue(displayedPatientResource, {
      codes: ['MR'],
      texts: ['MRN', 'INTERNAL', 'Medical record number'],
    })
  const displayedPatientSsn = getPatientIdentifierValue(displayedPatientResource, {
    codes: ['SS'],
    texts: ['Social Security Number'],
    systems: ['http://hl7.org/fhir/sid/us-ssn'],
  })
  const displayedPatientDriversLicense = getPatientIdentifierValue(displayedPatientResource, {
    codes: ['DL'],
    texts: ["Driver's License"],
  })
  const displayedPatientPassport = getPatientIdentifierValue(displayedPatientResource, {
    codes: ['PPN'],
    texts: ['Passport Number'],
  })
  const patientContacts = getPrimaryContacts(displayedPatientResource)
  const patientAddress = getPrimaryAddress(displayedPatientResource)
  const patientPcp = getPrimaryCareProvider(displayedPatientResource)
  const patientOrganization = getManagingOrganization(displayedPatientResource)
  const displayedPatientBirthSex = getPatientExtensionValue(
    displayedPatientResource,
    'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex',
  )
  const displayedPatientRace = getPatientExtensionValue(
    displayedPatientResource,
    'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
  )
  const displayedPatientEthnicity = getPatientExtensionValue(
    displayedPatientResource,
    'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
  )
  const displayedPatientLanguage = getPreferredLanguage(displayedPatientResource)
  const displayedPatientMaritalStatus = getMaritalStatus(displayedPatientResource)
  const backendClinicId =
    typeof session?.clinicId === 'string' && session.clinicId.trim() ? session.clinicId.trim() : ''
  const displayedPatientActive =
    patientResult?.active !== null && typeof patientResult?.active !== 'undefined'
      ? patientResult.active
      : typeof displayedPatientResource?.active === 'boolean'
        ? displayedPatientResource.active
        : null
  const hasPatientContext = Boolean(displayedPatientResource)
  const isUsingLaunchPatientFallback = !patientResult && Boolean(sessionPatientResource)
  const sidebarWarnings = [
    ...(shouldHideSearchPanel && lookupError ? [lookupError] : []),
    ...(patientResult?.supplementalErrors ?? []),
  ]
  const conditionRows = getConditionRows(patientResult?.conditions ?? [])
  const labRows = getLabRows(patientResult?.labs ?? [])
  const medicationRows = getMedicationRows(patientResult?.medications ?? [])
  const documentReferenceRows = getDocumentReferenceRows(patientResult?.documentReferences ?? [])
  const imagingObservationRows = getImagingObservationRows(patientResult?.imagingObservations ?? [])
  const imagingResultRows = getImagingResultRows(patientResult?.imagingResults ?? [])
  const visibleCdsCards = (patientResult?.cdsCards ?? []).filter(
    (card) =>
      !dismissedCardIds.includes(card.uuid) &&
      !isEmbeddedClinicalTrialLaunchCard(card) &&
      !isCdsTrialCard(card as unknown as CdsTrialCard),
  )
  // Merge trial cards from patientResult with independently-fetched ones
  const patientResultTrialCards: CdsTrialCard[] = (patientResult?.patientViewCdsCards ?? []).filter(
    (card) => isCdsTrialCard(card as unknown as CdsTrialCard),
  ) as unknown as CdsTrialCard[]
  const cdsTrialCards = patientResultTrialCards.length > 0 ? patientResultTrialCards : independentTrialCards
  const showClinicalTrialAlertCard = !isClinicalTrialCardDismissed && cdsTrialCards.length > 0
  const alertsSectionCount = visibleCdsCards.length + (showClinicalTrialAlertCard ? 1 : 0)
  const patientSections = hasPatientContext
    ? [
        { id: 'alerts' as const, label: 'Alerts', count: alertsSectionCount },
        { id: 'overview' as const, label: 'Demographics' },
        { id: 'labs' as const, label: 'Labs', count: patientResult?.labs.length ?? 0 },
        { id: 'conditions' as const, label: 'Conditions', count: patientResult?.conditions.length ?? 0 },
        { id: 'medications' as const, label: 'Medications', count: patientResult?.medications.length ?? 0 },
        { id: 'documents' as const, label: 'Documents', count: patientResult?.documentReferences.length ?? 0 },
        { id: 'imaging' as const, label: 'Imaging', count: patientResult?.imagingObservations.length ?? 0 },
        { id: 'imagingResults' as const, label: 'Imaging results', count: patientResult?.imagingResults.length ?? 0 },
        { id: 'raw' as const, label: 'Raw' },
      ]
    : []

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    clearSession()
    navigate('/', { replace: true })
  }

  const loadPatientById = async (patientId: string) => {
    setIsLoadingPatient(true)
    setLookupError('')

    try {
      const patient = await readProviderPatient({
        token: accessToken,
        practitionerId,
        fhirBase,
        patientId,
        clinicId: backendClinicId || undefined,
      })

      setDismissedCardIds([])
      setIsClinicalTrialCardDismissed(false)
      setPatientResult(patient)
      setSelectedSection('alerts')
      return true
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to read the Epic patient right now.'

      setLookupError(message)
      setDismissedCardIds([])
      setIsClinicalTrialCardDismissed(false)
      setPatientResult(null)
      setSelectedSection(sessionPatientResource ? 'alerts' : 'raw')
      return false
    } finally {
      setIsLoadingPatient(false)
    }
  }

  useEffect(() => {
    if (!smartPatientId || !accessToken || !fhirBase || !practitionerId) {
      return
    }

    if (autoLoadedPatientIdRef.current === smartPatientId || patientResult?.id === smartPatientId) {
      return
    }

    autoLoadedPatientIdRef.current = smartPatientId
    setPatientIdInput(smartPatientId)

    void (async () => {
      setIsLoadingPatient(true)
      setLookupError('')

      try {
        const patient = await readProviderPatient({
          token: accessToken,
          practitionerId,
          fhirBase,
          patientId: smartPatientId,
          clinicId: backendClinicId || undefined,
        })

        setDismissedCardIds([])
        setIsClinicalTrialCardDismissed(false)
        setPatientResult(patient)
        setSelectedSection('alerts')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to read the Epic patient right now.'

        setLookupError(message)
        setDismissedCardIds([])
        setIsClinicalTrialCardDismissed(false)
        setPatientResult(null)
        setSelectedSection(sessionPatientResource ? 'alerts' : 'raw')
        autoLoadedPatientIdRef.current = ''
      } finally {
        setIsLoadingPatient(false)
      }
    })()
  }, [
    accessToken,
    backendClinicId,
    fhirBase,
    patientResult?.id,
    practitionerId,
    sessionPatientResource,
    smartPatientId,
  ])

  useEffect(() => {
    const fallbackPatientId =
      patientResult?.id ||
      (typeof sessionPatientResource?.id === 'string' ? sessionPatientResource.id.trim() : '') ||
      smartPatientId

    if (!fallbackPatientId || lastIndependentTrialPatientIdRef.current === fallbackPatientId) {
      return
    }

    lastIndependentTrialPatientIdRef.current = fallbackPatientId

    fetchPatientViewCdsCards({
      patientId: fallbackPatientId,
      clinicId: backendClinicId || undefined,
    })
      .then((result) => {
        const trialOnly = result.cards.filter(
          (card) => isCdsTrialCard(card as unknown as CdsTrialCard),
        ) as unknown as CdsTrialCard[]
        setIndependentTrialCards(trialOnly)
      })
      .catch(() => {
        // Silently ignore — trial cards are a nice-to-have
      })
  }, [backendClinicId, patientResult?.id, sessionPatientResource, smartPatientId])

  if (!session) {
    return null
  }

  const handleDashboardHome = () => {
    setIsProfileMenuOpen(false)
    setLookupError('')
    setDismissedCardIds([])
    setIsClinicalTrialCardDismissed(false)
    setPatientResult(null)
    setSelectedSection(sessionPatientResource ? 'alerts' : 'raw')
    clearStoredSelectedPatient()
    autoLoadedPatientIdRef.current = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePatientRead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    autoLoadedPatientIdRef.current = patientIdInput.trim()
    await loadPatientById(patientIdInput)
  }

  const handleSectionSelect = (sectionId: ProviderSectionId) => {
    setSelectedSection(sectionId)

    if (isClinicalTrialFlowActive) {
      navigate(`/provider-dashboard${instanceSearch}`)
    }
  }

  const renderAlertsSection = () => {
    if (!patientResult) {
      return null
    }

    const alertColumns: Array<{
      key: AlertColumnKey
      label: string
      emptyMessage: string
    }> = [
      {
        key: 'critical',
        label: 'Critical',
        emptyMessage: 'No critical alerts for this patient.',
      },
      {
        key: 'warning',
        label: 'Warning',
        emptyMessage: 'No warning alerts for this patient.',
      },
      {
        key: 'information',
        label: 'Information',
        emptyMessage: 'No informational alerts for this patient.',
      },
    ]
    const groupedCards = alertColumns.map((column) => {
      const cards =
        column.key === 'information'
          ? visibleCdsCards.filter((card) => getAlertColumnKey(card.indicator) === column.key)
          : [
              // Temporarily suppressing non-trial alert cards while keeping the columns visible.
              // ...visibleCdsCards.filter((card) => getAlertColumnKey(card.indicator) === column.key),
            ]
      const includesClinicalTrialCard = column.key === 'information' && showClinicalTrialAlertCard

      return {
        ...column,
        cards,
        count: cards.length + (includesClinicalTrialCard ? 1 : 0),
        includesClinicalTrialCard,
      }
    })
    const alertsStatusMessage =
      patientResult.cdsCards.length === 0 && showClinicalTrialAlertCard
        ? 'Epic CDS returned no non-trial alert cards for this patient.'
        : patientResult.cdsCards.length > 0 && visibleCdsCards.length === 0 && showClinicalTrialAlertCard
          ? 'All non-trial CDS cards have been dismissed. Trial match cards from the API remain available.'
          : patientResult.cdsCards.length > 0 && visibleCdsCards.length === 0
            ? 'All CDS cards have been dismissed in this session.'
            : patientResult.cdsCards.length === 0
              ? 'The CDS service returned no alert cards for this patient.'
              : null

    return (
      <section className="cds-board full-width-data-card">
        {alertsStatusMessage ? <p className="cds-board-status">{alertsStatusMessage}</p> : null}
        <div className="cds-board-grid">
          {groupedCards.map((column) => (
            <section key={column.key} className="cds-board-column">
              <header className="cds-board-column-header">
                <span className="cds-board-column-title">{column.label}</span>
                <span className="cds-board-column-count">({column.count})</span>
              </header>
              <div className="cds-board-column-body">
                {column.includesClinicalTrialCard ? (
                  <ClinicalTrialMatchCard
                    instanceKey={instanceKey}
                    trialCards={cdsTrialCards}
                    onDismiss={() => setIsClinicalTrialCardDismissed(true)}
                  />
                ) : null}
                {column.cards.length > 0 ? (
                  column.cards.map((card) => (
                    <CdsHooksCard
                      key={card.uuid}
                      card={card}
                      onDismiss={(cardId) =>
                        setDismissedCardIds((currentIds) => [...currentIds, cardId])
                      }
                    />
                  ))
                ) : !column.includesClinicalTrialCard ? (
                  <p className="cds-board-empty">{column.emptyMessage}</p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </section>
    )
  }

  const renderEmptyAlertsSection = () => {
    const alertColumns: Array<{
      key: AlertColumnKey
      label: string
      emptyMessage: string
    }> = [
      {
        key: 'critical',
        label: 'Critical',
        emptyMessage: 'No critical alerts for this patient.',
      },
      {
        key: 'warning',
        label: 'Warning',
        emptyMessage: 'No warning alerts for this patient.',
      },
      {
        key: 'information',
        label: 'Information',
        emptyMessage: 'No informational alerts for this patient.',
      },
    ]

    return (
      <section className="cds-board full-width-data-card">
        <div className="cds-board-grid">
          {alertColumns.map((column) => {
            const includesClinicalTrialCard = column.key === 'information' && showClinicalTrialAlertCard
            const count = includesClinicalTrialCard ? 1 : 0

            return (
              <section key={column.key} className="cds-board-column">
                <header className="cds-board-column-header">
                  <span className="cds-board-column-title">{column.label}</span>
                  <span className="cds-board-column-count">({count})</span>
                </header>
                <div className="cds-board-column-body">
                  {includesClinicalTrialCard ? (
                    <ClinicalTrialMatchCard
                      instanceKey={instanceKey}
                      trialCards={cdsTrialCards}
                      onDismiss={() => setIsClinicalTrialCardDismissed(true)}
                    />
                  ) : (
                    <p className="cds-board-empty">{column.emptyMessage}</p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </section>
    )
  }

  const renderLoadingSkeleton = () => (
    <>
      <aside className="surface provider-sidebar provider-skeleton-sidebar">
        <div className="provider-sidebar-header">
          <span className="skeleton-line skeleton-line--sm" />
          <span className="skeleton-line skeleton-line--lg" />
          <span className="skeleton-line skeleton-line--md" />
        </div>

        <div className="provider-sidebar-nav provider-skeleton-nav" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="provider-sidebar-link provider-skeleton-link">
              <span className="skeleton-line skeleton-line--md" />
              <span className="skeleton-chip" />
            </div>
          ))}
        </div>

        <div className="skeleton-button" />
      </aside>

      <div className="provider-stage">
        <div className="data-grid provider-stage-grid">
          <section className="surface data-card full-width-data-card provider-skeleton-card">
            <div className="provider-skeleton-stack">
              <span className="skeleton-line skeleton-line--title" />
              <span className="skeleton-line skeleton-line--sm" />
              <div className="provider-skeleton-table">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="provider-skeleton-row">
                    <span className="skeleton-line skeleton-line--md" />
                    <span className="skeleton-line skeleton-line--lg" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="surface data-card full-width-data-card provider-skeleton-card">
            <div className="provider-skeleton-stack">
              <span className="skeleton-line skeleton-line--title" />
              <span className="skeleton-line skeleton-line--sm" />
              <span className="skeleton-block" />
            </div>
          </section>
        </div>
      </div>
    </>
  )

  const renderSelectedSection = () => {
    if (isClinicalTrialFlowActive) {
      switch (clinicalTrialRouteView) {
        case 'matches':
          return <ClinicalTrialMatchesView embedded />
        case 'detail':
          return <ClinicalTrialDetailView embedded />
        case 'refer':
          return <ClinicalTrialReferralView embedded />
        default:
          break
      }
    }

    if (!patientResult && !sessionPatientResource) {
      return (
        <DataCard
          className="full-width-data-card"
          title="Raw launch payload"
          description="Provider SMART launch data currently available in this session."
          collapsible
          defaultOpen
          data={session}
        />
      )
    }

    if (!patientResult) {
      switch (selectedSection) {
        case 'alerts':
          return (
            <div className="provider-content-stack">
              {renderEmptyAlertsSection()}
            </div>
          )

        case 'labs':
          return (
            <DataCard
              className="full-width-data-card"
              title="Laboratory results"
              description="Laboratory observations returned from the Epic observation query."
              badge="0"
              rows={[{ label: 'Labs', value: 'No laboratory data returned.' }]}
            />
          )

        case 'conditions':
          return (
            <DataCard
              className="full-width-data-card"
              title="Conditions"
              description="Problem list conditions returned from the Epic condition query."
              badge="0"
              rows={[{ label: 'Conditions', value: 'No condition data returned.' }]}
            />
          )

        case 'medications':
          return (
            <DataCard
              className="full-width-data-card"
              title="Medication requests"
              description="Active medication requests returned from the Epic MedicationRequest query."
              badge="0"
              rows={[{ label: 'Medication requests', value: 'No active medication requests returned.' }]}
            />
          )

        case 'documents':
          return (
            <DataCard
              className="full-width-data-card"
              title="Document references"
              description="Clinical-note document references returned from Epic."
              badge="0"
              rows={[{ label: 'Document references', value: 'No document references returned.' }]}
            />
          )

        case 'imaging':
          return (
            <DataCard
              className="full-width-data-card"
              title="Imaging observations"
              description="Imaging observations returned from the Epic Observation query."
              badge="0"
              rows={[{ label: 'Imaging observations', value: 'No imaging observations returned.' }]}
            />
          )

        case 'imagingResults':
          return (
            <DataCard
              className="full-width-data-card"
              title="Imaging results"
              description="Imaging-result document references returned from Epic."
              badge="0"
              rows={[{ label: 'Imaging results', value: 'No imaging results returned.' }]}
            />
          )

        case 'raw':
          return (
            <div className="provider-content-stack">
              <DataCard
                className="full-width-data-card"
                title="Raw patient context"
                description="FHIR Patient resource already present in the SMART launch session."
                collapsible
                defaultOpen
                data={sessionPatientResource}
              />
              <DataCard
                className="full-width-data-card"
                title="Raw launch payload"
                description="Complete provider SMART launch payload currently available in this session."
                collapsible
                data={session}
              />
            </div>
          )

        case 'overview':
        default:
          return (
            <div className="provider-content-stack">
              <DataCard
                className="full-width-data-card"
                title="Patient overview"
                description={
                  isUsingLaunchPatientFallback
                    ? 'Demographic data already present in SMART launch context. The Epic patient read was not required for these fields.'
                    : 'Core demographic data returned from the available patient context.'
                }
                rows={[
                  { label: 'Name', value: displayedPatientName },
                  { label: 'FHIR ID', value: displayedPatientId },
                  { label: 'Birth date', value: displayedPatientBirthDate },
                  { label: 'Gender', value: displayedPatientGender },
                  { label: 'MRN', value: displayedPatientMrn },
                  { label: 'SSN', value: displayedPatientSsn },
                  { label: "Driver's license", value: displayedPatientDriversLicense },
                  { label: 'Passport', value: displayedPatientPassport },
                  { label: 'Birth sex', value: displayedPatientBirthSex },
                  { label: 'Race', value: displayedPatientRace },
                  { label: 'Ethnicity', value: displayedPatientEthnicity },
                  { label: 'Marital status', value: displayedPatientMaritalStatus },
                  { label: 'Preferred language', value: displayedPatientLanguage },
                  {
                    label: 'Active',
                    value:
                      displayedPatientActive === null
                        ? 'Not available'
                        : displayedPatientActive
                          ? 'Yes'
                          : 'No',
                  },
                  { label: 'Phone', value: patientContacts.phone },
                  { label: 'Email', value: patientContacts.email },
                  { label: 'Address', value: patientAddress },
                  { label: 'Primary care provider', value: patientPcp },
                  { label: 'Managing organization', value: patientOrganization },
                ]}
              />

              <section className="surface patient-result-card action-card full-width-data-card">
                <div className="patient-result-meta">
                  <span className="patient-result-name">{displayedPatientName}</span>
                  <span className="patient-result-id">
                    Demographics are being shown from SMART launch context.
                  </span>
                </div>

                <div className="result-detail-grid">
                  <span>Identifiers and contact details can still be reviewed even when additional Epic queries fail.</span>
                  <span>Use the Raw section to inspect the full Patient resource carried in the launch payload.</span>
                </div>
              </section>
            </div>
          )
      }
    }

    switch (selectedSection) {
      case 'alerts':
        return (
          <div className="provider-content-stack">
            {renderAlertsSection()}
            <DataCard
              className="full-width-data-card"
              title="CDS Hooks response"
              description="Formatted responses returned by the backend `patient-view`, `observation-view`, and `order-select` CDS services."
              collapsible
              data={patientResult.cdsResponse}
            />
            <DataCard
              className="full-width-data-card"
              title="CDS Hooks request"
              description="Exact request bodies sent to the backend `patient-view`, `observation-view`, and `order-select` CDS services."
              collapsible
              data={patientResult.cdsRequest}
            />
          </div>
        )

      case 'overview':
        return (
          <div className="provider-content-stack">
            <DataCard
              className="full-width-data-card"
              title="Patient overview"
              description="Core demographic data returned from the Epic patient read."
              rows={[
                { label: 'Name', value: displayedPatientName },
                { label: 'FHIR ID', value: displayedPatientId },
                { label: 'Birth date', value: displayedPatientBirthDate },
                { label: 'Gender', value: displayedPatientGender },
                { label: 'MRN', value: displayedPatientMrn },
                { label: 'SSN', value: displayedPatientSsn },
                { label: "Driver's license", value: displayedPatientDriversLicense },
                { label: 'Passport', value: displayedPatientPassport },
                { label: 'Birth sex', value: displayedPatientBirthSex },
                { label: 'Race', value: displayedPatientRace },
                { label: 'Ethnicity', value: displayedPatientEthnicity },
                { label: 'Marital status', value: displayedPatientMaritalStatus },
                { label: 'Preferred language', value: displayedPatientLanguage },
                {
                  label: 'Active',
                  value:
                    displayedPatientActive === null
                      ? 'Not available'
                      : displayedPatientActive
                        ? 'Yes'
                        : 'No',
                },
                { label: 'Phone', value: patientContacts.phone },
                { label: 'Email', value: patientContacts.email },
                { label: 'Address', value: patientAddress },
                { label: 'Primary care provider', value: patientPcp },
                { label: 'Managing organization', value: patientOrganization },
              ]}
            />

            <section className="surface patient-result-card action-card full-width-data-card">
              <div className="patient-result-meta">
                <span className="patient-result-name">{patientResult.name}</span>
                <span className="patient-result-id">Patient read completed successfully</span>
              </div>

              <div className="result-detail-grid">
                <span>The provider workspace is focused on this patient.</span>
                <span>Use the left sidebar to switch between alerts and clinical sections.</span>
              </div>

             
            </section>
          </div>
        )

      case 'labs':
        return (
          <DataCard
            className="full-width-data-card"
            title="Laboratory results"
            description="Laboratory observations returned from the Epic observation query."
            badge={String(patientResult.labs.length)}
            rows={labRows.length > 0 ? labRows : [{ label: 'Labs', value: 'No laboratory data returned.' }]}
          />
        )

      case 'conditions':
        return (
          <DataCard
            className="full-width-data-card"
            title="Conditions"
            description="Problem list conditions returned from the Epic condition query."
            badge={String(patientResult.conditions.length)}
            rows={
              conditionRows.length > 0
                ? conditionRows
                : [{ label: 'Conditions', value: 'No condition data returned.' }]
            }
          />
        )

      case 'medications':
        return (
          <DataCard
            className="full-width-data-card"
            title="Medication requests"
            description="Active medication requests returned from the Epic MedicationRequest query."
            badge={String(patientResult.medications.length)}
            rows={
              medicationRows.length > 0
                ? medicationRows
                : [{ label: 'Medication requests', value: 'No active medication requests returned.' }]
            }
          />
        )

      case 'documents':
        return (
          <DataCard
            className="full-width-data-card"
            title="Document references"
            description="Clinical-note document references returned from Epic."
            badge={String(patientResult.documentReferences.length)}
            rows={
              documentReferenceRows.length > 0
                ? documentReferenceRows
                : [{ label: 'Document references', value: 'No document references returned.' }]
            }
          />
        )

      case 'imaging':
        return (
          <DataCard
            className="full-width-data-card"
            title="Imaging observations"
            description="Imaging observations returned from the Epic Observation query."
            badge={String(patientResult.imagingObservations.length)}
            rows={
              imagingObservationRows.length > 0
                ? imagingObservationRows
                : [{ label: 'Imaging observations', value: 'No imaging observations returned.' }]
            }
          />
        )

      case 'imagingResults':
        return (
          <DataCard
            className="full-width-data-card"
            title="Imaging results"
            description="Imaging-result document references returned from Epic."
            badge={String(patientResult.imagingResults.length)}
            rows={
              imagingResultRows.length > 0
                ? imagingResultRows
                : [{ label: 'Imaging results', value: 'No imaging results returned.' }]
            }
          />
        )

      case 'raw':
        return (
          <div className="provider-content-stack">
            <DataCard
              className="full-width-data-card"
              title="Raw patient response"
              description="Full FHIR Patient response returned by Epic for the requested ID."
              collapsible
              defaultOpen
              data={displayedPatientResource}
            />
            <DataCard
              className="full-width-data-card"
              title="Raw laboratory response"
              description="Full FHIR Observation bundle returned for this patient."
              collapsible
              data={patientResult.labBundle}
            />
            <DataCard
              className="full-width-data-card"
              title="Raw condition response"
              description="Full FHIR Condition bundle returned for this patient."
              collapsible
              data={patientResult.conditionBundle}
            />
            <DataCard
              className="full-width-data-card"
              title="Raw medication response"
              description="Full FHIR MedicationRequest bundle returned for this patient."
              collapsible
              data={patientResult.medicationBundle}
            />
            <DataCard
              className="full-width-data-card"
              title="Raw document-reference response"
              description="Full FHIR DocumentReference bundle returned for this patient."
              collapsible
              data={patientResult.documentReferenceBundle}
            />
            <DataCard
              className="full-width-data-card"
              title="Raw imaging observation response"
              description="Full FHIR imaging Observation bundle returned for this patient."
              collapsible
              data={patientResult.imagingObservationBundle}
            />
            <DataCard
              className="full-width-data-card"
              title="Raw imaging-result response"
              description="Full FHIR imaging-result DocumentReference bundle returned for this patient."
              collapsible
              data={patientResult.imagingResultBundle}
            />
            <DataCard
              className="full-width-data-card"
              title="CDS Hooks response"
              description="Formatted responses returned by the backend `patient-view`, `observation-view`, and `order-select` CDS services."
              collapsible
              data={patientResult.cdsResponse}
            />
            <DataCard
              className="full-width-data-card"
              title="CDS Hooks request"
              description="Exact request bodies sent to the backend `patient-view`, `observation-view`, and `order-select` CDS services."
              collapsible
              data={patientResult.cdsRequest}
            />
          </div>
        )
    }
  }

  return (
    <main className="page-shell provider-page-shell">
      <header className="dashboard-header provider-topbar">
        <button type="button" className="brand-home-button brand-lockup" onClick={handleDashboardHome}>
          <div className="brand-mark brand-mark-ulalao">
            {/* <UlaloLogo /> */}
          </div>
        </button>

        <div className="provider-header-title">
          {/* <span className="provider-header-kicker">Workspace</span> */}
          {/* <h1 className="provider-header-heading">Provider dashboard</h1> */}
        </div>

        <div ref={profileMenuRef} className="provider-profile-shell">
          <button
            type="button"
            className="provider-profile-trigger"
            aria-expanded={isProfileMenuOpen}
            aria-label="Open provider menu"
            onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
          >
            <span className="provider-profile-trigger-copy">
              {/* <span className="provider-profile-trigger-label">Provider</span> */}
              <span className="provider-profile-trigger-name">{providerName}</span>
            </span>
            <span className="provider-profile-avatar">{providerInitials}</span>
          </button>

          {isProfileMenuOpen ? (
            <div className="surface provider-profile-menu">
              <strong className="provider-profile-name">{providerName}</strong>
              <span className="provider-profile-role">Practitioner</span>
              <button type="button" className="secondary-button provider-menu-button" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {!shouldHideSearchPanel ? (
        <section className="surface search-panel provider-hero-panel">
          <form className="search-form read-form" onSubmit={handlePatientRead}>
            <label className="field-group search-field-group" aria-label="Patient FHIR ID">
              <input
                className="field-input"
                type="text"
                placeholder="Enter Patient FHIR ID"
                value={patientIdInput}
                onChange={(event) => setPatientIdInput(event.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={isLoadingPatient || !accessToken || !fhirBase || !practitionerId}
            >
              {isLoadingPatient ? 'Loading patient...' : 'Load patient'}
            </button>
          </form>

          {lookupError ? <p className="error-banner">{lookupError}</p> : null}
          {patientResult?.supplementalErrors?.length ? (
            <p className="warning-banner">{patientResult.supplementalErrors.join(' ')}</p>
          ) : null}
        </section>
      ) : sidebarWarnings.length ? (
        <section className="surface provider-hero-panel">
          {sidebarWarnings.map((warning, index) => (
            <p key={`${warning}-${index}`} className="warning-banner">
              {warning}
            </p>
          ))}
        </section>
      ) : null}

      <section
        className={`results-section provider-dashboard-shell ${hasPatientContext || isLoadingPatient || shouldShowAutoLoadingState ? '' : 'provider-dashboard-shell--solo'}`.trim()}
      >
        {isLoadingPatient || shouldShowAutoLoadingState ? (
          renderLoadingSkeleton()
        ) : hasPatientContext ? (
          <aside className="surface provider-sidebar">
            <div className="provider-sidebar-header">
              <span className="provider-section-kicker">Patient sections</span>
              <strong className="provider-sidebar-title">{displayedPatientName}</strong>
              <span className="provider-sidebar-subtitle">{displayedPatientId}</span>
            </div>

            <nav className="provider-sidebar-nav" aria-label="Patient data sections">
	              {patientSections.map((section) => (
	                <button
	                  key={section.id}
	                  type="button"
	                  className={`provider-sidebar-link ${(isClinicalTrialFlowActive ? 'alerts' : selectedSection) === section.id ? 'is-active' : ''}`.trim()}
	                  onClick={() => handleSectionSelect(section.id)}
	                >
                  <span>{section.label}</span>
                  {typeof section.count === 'number' ? (
                    <span className="provider-section-count">{section.count}</span>
                  ) : null}
                </button>
              ))}
            </nav>

            
          </aside>
        ) : null}

        {!isLoadingPatient && !shouldShowAutoLoadingState ? (
          <div className="provider-stage" key={selectedSection}>
            <div className="data-grid provider-stage-grid">{renderSelectedSection()}</div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default ProviderDashboard
