import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ClinicalTrialMatchCard from '../components/ClinicalTrialMatchCard'
import CdsHooksCard from '../components/CdsHooksCard'
import DataCard from '../components/DataCard'
import { ClinicalTrialDetailView } from './ClinicalTrialDetailPage'
import { ClinicalTrialMatchesView } from './ClinicalTrialMatchesPage'
import { ClinicalTrialReferralView } from './ClinicalTrialReferralPage'
import { fetchPatientViewCdsCards } from '../api/patientCdsService'
import { useEpicSession } from '../hooks/useEpicSession'
import { type CdsTrialCard, isCdsTrialCard, setCdsTrials } from '../data/mockClinicalTrials'
import {
  extractPatientResource,
  extractPractitionerResource,
  formatHumanName,
  type CdsCard,
  getSessionDashboardPath,
  getStoredSelectedPatient,
} from '../utils/epicSession'
import {
  getConditionRows,
  getDocumentReferenceRows,
  getImagingObservationRows,
  getImagingResultRows,
  getLabRows,
  getMedicationRows,
} from '../utils/patientResourceFormatting'

type PatientSectionId =
  | 'alerts'
  | 'overview'
  | 'trials'
  | 'conditions'
  | 'labs'
  | 'medications'
  | 'documents'
  | 'imaging'
  | 'imagingResults'
  | 'raw'

type AlertColumnKey = 'critical' | 'warning' | 'information'

function getAlertColumnKey(indicator: string | undefined): AlertColumnKey {
  if (indicator === 'critical') return 'critical'
  if (indicator === 'warning') return 'warning'
  return 'information'
}

function isEmbeddedClinicalTrialLaunchCard(card: CdsCard) {
  return card.summary === 'Clinical Trial Matches Available' && card.source?.label === 'Ulalo Clinical Trials'
}

type ClinicalTrialRouteView = 'none' | 'matches' | 'detail' | 'refer'

function getClinicalTrialRouteView(pathname: string): ClinicalTrialRouteView {
  if (pathname.includes('/patient-dashboard/trial-matches/')) return 'detail'
  if (pathname.endsWith('/patient-dashboard/trial-matches')) return 'matches'
  if (pathname.endsWith('/patient-dashboard/refer-coordinator')) return 'refer'
  return 'none'
}

function getInitials(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)

  if (words.length === 0 || name === 'Not available') {
    return 'PT'
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

// Extract FHIR resource entries from a Bundle
function extractBundleEntries(bundle: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!bundle || typeof bundle !== 'object') return []
  const entries = Array.isArray((bundle as { entry?: unknown[] }).entry)
    ? ((bundle as { entry?: Array<{ resource?: Record<string, unknown> }> }).entry ?? [])
    : []
  return entries
    .map((e) => e?.resource)
    .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
}

function PatientDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, clearSession, instanceKey } = useEpicSession()
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const dataFetchedRef = useRef(false)
  const [selectedSection, setSelectedSection] = useState<PatientSectionId>('alerts')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [cdsCards, setCdsCards] = useState<CdsCard[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [isClinicalTrialCardDismissed, setIsClinicalTrialCardDismissed] = useState(false)
  const [dismissedCardIds, setDismissedCardIds] = useState<string[]>([])
  // Clinical data from prefetch (used when selectedPatient is empty)
  const [prefetchConditions, setPrefetchConditions] = useState<Record<string, unknown>[]>([])
  const [prefetchLabs, setPrefetchLabs] = useState<Record<string, unknown>[]>([])
  const [prefetchMedications, setPrefetchMedications] = useState<Record<string, unknown>[]>([])
  const [prefetchDocRefs, setPrefetchDocRefs] = useState<Record<string, unknown>[]>([])
  const [prefetchImaging, setPrefetchImaging] = useState<Record<string, unknown>[]>([])
  const [prefetchImagingResults, setPrefetchImagingResults] = useState<Record<string, unknown>[]>([])
  const [prefetchRaw, setPrefetchRaw] = useState<Record<string, unknown> | null>(null)
  const instanceSearch = instanceKey ? `?instanceKey=${encodeURIComponent(instanceKey)}` : ''

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
    }
  }, [navigate, session])

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

  if (!session) {
    return null
  }

  const selectedPatient = getStoredSelectedPatient()
  const patientResource =
    session.authType === 'patient' ? extractPatientResource(session) : selectedPatient?.resource || null
  const patientName = formatHumanName(patientResource)
  const practitionerName = formatHumanName(extractPractitionerResource(session))
  const activeActorName = session.authType === 'provider' ? practitionerName : patientName
  const activeActorRole = session.authType === 'provider' ? 'Practitioner' : 'Patient'
  const activeActorInitials = getInitials(activeActorName)
  const patientId =
    typeof patientResource?.id === 'string'
      ? patientResource.id
      : selectedPatient?.id || String(session.patientId || 'Not available')
  const birthDate =
    typeof patientResource?.birthDate === 'string'
      ? patientResource.birthDate
      : selectedPatient?.birthDate || 'Not available'
  const gender =
    typeof patientResource?.gender === 'string'
      ? patientResource.gender
      : selectedPatient?.gender || 'Not available'
  const isProviderSelectedPatient = session.authType === 'provider'
  // Use selectedPatient data (from Provider Dashboard) or prefetched data (from patient login)
  const conditions = (selectedPatient?.conditions?.length ? selectedPatient.conditions : prefetchConditions)
  const labs = (selectedPatient?.labs?.length ? selectedPatient.labs : prefetchLabs)
  const medications = (selectedPatient?.medications?.length ? selectedPatient.medications : prefetchMedications)
  const documentReferences = (selectedPatient?.documentReferences?.length ? selectedPatient.documentReferences : prefetchDocRefs)
  const imagingObservations = (selectedPatient?.imagingObservations?.length ? selectedPatient.imagingObservations : prefetchImaging)
  const imagingResults = (selectedPatient?.imagingResults?.length ? selectedPatient.imagingResults : prefetchImagingResults)
  const conditionRows = getConditionRows(conditions)
  const labRows = getLabRows(labs)
  const medicationRows = getMedicationRows(medications)
  const documentReferenceRows = getDocumentReferenceRows(documentReferences)
  const imagingObservationRows = getImagingObservationRows(imagingObservations)
  const imagingResultRows = getImagingResultRows(imagingResults)
  // CDS clinical trial cards
  const visibleCdsCards = cdsCards.filter(
    (card) =>
      !dismissedCardIds.includes(card.uuid) &&
      !isEmbeddedClinicalTrialLaunchCard(card) &&
      !isCdsTrialCard(card as unknown as CdsTrialCard),
  )
  const cdsTrialCards: CdsTrialCard[] = cdsCards.filter(
    (card) => isCdsTrialCard(card as unknown as CdsTrialCard),
  ) as unknown as CdsTrialCard[]
  const showClinicalTrialAlertCard = !isClinicalTrialCardDismissed && cdsTrialCards.length > 0
  const alertsSectionCount = visibleCdsCards.length + (showClinicalTrialAlertCard ? 1 : 0)

  // Clinical trial sub-route view (review/refer)
  const clinicalTrialRouteView = getClinicalTrialRouteView(location.pathname)
  const isClinicalTrialFlowActive = clinicalTrialRouteView !== 'none'

  const patientSections = patientResource
    ? [
        { id: 'alerts' as const, label: 'Alerts', count: alertsSectionCount },
        { id: 'overview' as const, label: 'Demographics' },
        { id: 'conditions' as const, label: 'Conditions', count: conditions.length },
        { id: 'labs' as const, label: 'Labs', count: labs.length },
        { id: 'medications' as const, label: 'Medications', count: medications.length },
        { id: 'documents' as const, label: 'Documents', count: documentReferences.length },
        { id: 'imaging' as const, label: 'Imaging', count: imagingObservations.length },
        { id: 'imagingResults' as const, label: 'Imaging results', count: imagingResults.length },
        { id: 'raw' as const, label: 'Raw' },
      ]
    : []

  // Fetch prefetch data + CDS cards on mount
  useEffect(() => {
    if (dataFetchedRef.current) return
    dataFetchedRef.current = true

    const clinicId =
      typeof session?.clinicId === 'string' && session.clinicId.trim() ? session.clinicId.trim() : ''

    setIsDataLoading(true)
    setCdsCards([])
    setIsClinicalTrialCardDismissed(false)

    fetchPatientViewCdsCards({
      patientId,
      clinicId: clinicId || undefined,
    })
      .then((result) => {
        setCdsCards(result.cards)

        // Extract clinical data from prefetch for the sidebar sections
        if (result.prefetch) {
          const pf = result.prefetch
          setPrefetchConditions(extractBundleEntries(pf.conditions))
          setPrefetchLabs(extractBundleEntries(pf.labs))
          setPrefetchMedications(extractBundleEntries(pf.medicationRequests))
          setPrefetchDocRefs(extractBundleEntries(pf.documentReferences))
          setPrefetchImaging(extractBundleEntries(pf.imagingObservations))
          setPrefetchImagingResults(extractBundleEntries(pf.imagingResults))
          setPrefetchRaw(pf as unknown as Record<string, unknown>)
        }

        // Store trial cards globally for sub-pages
        const trialOnly = result.cards.filter(
          (card) => isCdsTrialCard(card as unknown as CdsTrialCard),
        ) as unknown as CdsTrialCard[]
        setCdsTrials(trialOnly)
      })
      .catch(() => {
        setCdsCards([])
      })
      .finally(() => {
        setIsDataLoading(false)
      })
  }, [patientId, session])

  const handleLogout = () => {
    setIsProfileMenuOpen(false)
    clearSession()
    navigate('/', { replace: true })
  }

  const handleDashboardHome = () => {
    setIsProfileMenuOpen(false)
    navigate(`${getSessionDashboardPath(session)}${instanceSearch}`, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderAlertsSection = () => {
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
          : []
      const includesClinicalTrialCard = column.key === 'information' && showClinicalTrialAlertCard

      return {
        ...column,
        cards,
        count: cards.length + (includesClinicalTrialCard ? 1 : 0),
        includesClinicalTrialCard,
      }
    })

    const alertsStatusMessage =
      cdsCards.length === 0 && showClinicalTrialAlertCard
        ? 'Epic CDS returned no non-trial alert cards for this patient.'
        : cdsCards.length > 0 && visibleCdsCards.length === 0 && showClinicalTrialAlertCard
          ? 'All non-trial CDS cards have been dismissed. Trial match cards from the API remain available.'
          : cdsCards.length > 0 && visibleCdsCards.length === 0
            ? 'All CDS cards have been dismissed in this session.'
            : cdsCards.length === 0
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
    if (!patientResource) {
      return (
        <section className="surface empty-state-card full-width-data-card">
          <h2 className="section-title">No patient selected yet</h2>
          <p className="section-copy">
            Open a patient from the provider dashboard search results, or start a patient login if
            you want the dashboard to load patient launch context directly.
          </p>
          <div className="dashboard-actions">
            {session.authType === 'provider' ? (
              <Link to={`/provider-dashboard${instanceSearch}`} className="primary-button">
                Go to provider dashboard
              </Link>
            ) : (
              <Link to="/" className="primary-button">
                Start a patient login
              </Link>
            )}
          </div>
        </section>
      )
    }

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

    switch (selectedSection) {
      case 'alerts':
        return (
          <div className="provider-content-stack">
            {renderAlertsSection()}
          </div>
        )

      case 'overview':
        return (
          <div className="provider-content-stack">
            <DataCard
              className="full-width-data-card"
              title="Patient summary"
              description="Key demographic details from the selected patient context."
              rows={[
                { label: 'Name', value: patientName },
                { label: 'FHIR ID', value: patientId },
                { label: 'Birth date', value: birthDate },
                { label: 'Gender', value: gender },
              ]}
            />

            {isDataLoading ? (
              <section className="surface full-width-data-card">
                <p className="section-copy">Loading clinical trial data…</p>
              </section>
            ) : null}

            <section className="surface patient-result-card action-card full-width-data-card">
              <div className="patient-result-meta">
                <span className="patient-result-name">{patientName}</span>
                <span className="patient-result-id">
                  {isProviderSelectedPatient
                    ? 'This patient view was opened from the provider dashboard.'
                    : 'This patient view was loaded from SMART launch context.'}
                </span>
              </div>

              <div className="result-detail-grid">
                <span>Use the left sidebar to switch between demographics, resources, and raw responses.</span>
                <span>
                  {isDataLoading
                    ? 'Loading clinical data from the backend…'
                    : 'Clinical data has been loaded. Check the sidebar sections for details.'}
                </span>
              </div>

              {session.authType === 'provider' ? (
                <Link to={`/provider-dashboard${instanceSearch}`} className="secondary-button">
                  Back to provider view
                </Link>
              ) : null}
            </section>
          </div>
        )

      case 'conditions':
        return (
          <DataCard
            className="full-width-data-card"
            title="Conditions"
            description="Problem list conditions returned during the provider patient read."
            collapsible
            badge={String(conditions.length)}
            rows={
              conditionRows.length > 0
                ? conditionRows
                : [{ label: 'Conditions', value: 'No condition data returned.' }]
            }
          />
        )

      case 'labs':
        return (
          <DataCard
            className="full-width-data-card"
            title="Laboratory results"
            description="Laboratory observations returned during the provider patient read."
            collapsible
            badge={String(labs.length)}
            rows={labRows.length > 0 ? labRows : [{ label: 'Labs', value: 'No laboratory data returned.' }]}
          />
        )

      case 'medications':
        return (
          <DataCard
            className="full-width-data-card"
            title="Medication requests"
            description="Active medication requests returned during the provider patient read."
            collapsible
            badge={String(medications.length)}
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
            description="Clinical-note document references returned during the provider patient read."
            collapsible
            badge={String(documentReferences.length)}
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
            description="Imaging observations returned during the provider patient read."
            collapsible
            badge={String(imagingObservations.length)}
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
            description="Imaging-result document references returned during the provider patient read."
            collapsible
            badge={String(imagingResults.length)}
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
              title="Patient resource"
              description="Raw FHIR Patient resource currently displayed in the dashboard."
              collapsible
              defaultOpen
              data={patientResource}
            />

            {selectedPatient?.conditionBundle ? (
              <DataCard
                className="full-width-data-card"
                title="Raw condition response"
                description="Full FHIR Condition bundle associated with this patient."
                collapsible
                data={selectedPatient.conditionBundle}
              />
            ) : null}

            {selectedPatient?.labBundle ? (
              <DataCard
                className="full-width-data-card"
                title="Raw laboratory response"
                description="Full FHIR Observation bundle associated with this patient."
                collapsible
                data={selectedPatient.labBundle}
              />
            ) : null}

            {selectedPatient?.medicationBundle ? (
              <DataCard
                className="full-width-data-card"
                title="Raw medication response"
                description="Full FHIR MedicationRequest bundle associated with this patient."
                collapsible
                data={selectedPatient.medicationBundle}
              />
            ) : null}

            {selectedPatient?.documentReferenceBundle ? (
              <DataCard
                className="full-width-data-card"
                title="Raw document-reference response"
                description="Full FHIR DocumentReference bundle associated with this patient."
                collapsible
                data={selectedPatient.documentReferenceBundle}
              />
            ) : null}

            {selectedPatient?.imagingObservationBundle ? (
              <DataCard
                className="full-width-data-card"
                title="Raw imaging observation response"
                description="Full FHIR imaging Observation bundle associated with this patient."
                collapsible
                data={selectedPatient.imagingObservationBundle}
              />
            ) : null}

            {selectedPatient?.imagingResultBundle ? (
              <DataCard
                className="full-width-data-card"
                title="Raw imaging-result response"
                description="Full FHIR imaging-result DocumentReference bundle associated with this patient."
                collapsible
                data={selectedPatient.imagingResultBundle}
              />
            ) : null}

            {!selectedPatient && prefetchRaw ? (
              <DataCard
                className="full-width-data-card"
                title="Raw prefetch data"
                description="Full FHIR prefetch data fetched from the backend for this patient."
                collapsible
                data={prefetchRaw}
              />
            ) : null}

            <DataCard
              className="full-width-data-card"
              title="Raw session payload"
              description="Persisted callback data for the current SMART session."
              collapsible
              data={session}
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
          <span className="provider-header-kicker">Workspace</span>
          <h1 className="provider-header-heading">Patient dashboard</h1>
        </div>

        <div ref={profileMenuRef} className="provider-profile-shell">
          <button
            type="button"
            className="provider-profile-trigger"
            aria-expanded={isProfileMenuOpen}
            aria-label="Open profile menu"
            onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
          >
            <span className="provider-profile-trigger-copy">
              <span className="provider-profile-trigger-name">{activeActorName}</span>
            </span>
            <span className="provider-profile-avatar">{activeActorInitials}</span>
          </button>

          {isProfileMenuOpen ? (
            <div className="surface provider-profile-menu">
              <strong className="provider-profile-name">{activeActorName}</strong>
              <span className="provider-profile-role">{activeActorRole}</span>
              {session.authType === 'provider' ? (
                <Link to={`/provider-dashboard${instanceSearch}`} className="secondary-button provider-menu-button">
                  Back to provider view
                </Link>
              ) : null}
              <button type="button" className="secondary-button provider-menu-button" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <section
        className={`results-section provider-dashboard-shell ${patientResource && !isDataLoading ? '' : 'provider-dashboard-shell--solo'}`.trim()}
      >
        {isDataLoading ? (
          renderLoadingSkeleton()
        ) : patientResource ? (
          <>
            <aside className="surface provider-sidebar">
              <div className="provider-sidebar-header">
                <span className="provider-section-kicker">Patient sections</span>
                <strong className="provider-sidebar-title">{patientName}</strong>
                <span className="provider-sidebar-subtitle">{patientId}</span>
              </div>

              <nav className="provider-sidebar-nav" aria-label="Patient data sections">
                {patientSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`provider-sidebar-link ${selectedSection === section.id ? 'is-active' : ''}`.trim()}
                    onClick={() => {
                      setSelectedSection(section.id)
                      if (isClinicalTrialFlowActive) {
                        navigate(`/patient-dashboard${instanceSearch}`)
                      }
                    }}
                  >
                    <span>{section.label}</span>
                    {typeof section.count === 'number' ? (
                      <span className="provider-section-count">{section.count}</span>
                    ) : null}
                  </button>
                ))}
              </nav>

              {session.authType === 'provider' ? (
                <Link to={`/provider-dashboard${instanceSearch}`} className="secondary-button provider-sidebar-action">
                  Back to provider view
                </Link>
              ) : null}
            </aside>
            <div className="provider-stage" key={selectedSection}>
              <div className="data-grid provider-stage-grid">{renderSelectedSection()}</div>
            </div>
          </>
        ) : (
          <div className="provider-stage" key={selectedSection}>
            <div className="data-grid provider-stage-grid">{renderSelectedSection()}</div>
          </div>
        )}
      </section>
    </main>
  )
}

export default PatientDashboard
