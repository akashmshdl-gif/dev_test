import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ClinicalTrialFlowLayout from '../components/ClinicalTrialFlowLayout'
import {
  getCdsBestTrial,
  getCdsTrialById,
  getTrialCardId,
  getTrialCardServiceRequest,
} from '../data/mockClinicalTrials'
import { useEpicSession } from '../hooks/useEpicSession'
import { buildClinicalTrialSearch } from '../utils/clinicalTrialRoutes'

type ClinicalTrialDetailViewProps = {
  embedded?: boolean
}

export function ClinicalTrialDetailView({ embedded = false }: ClinicalTrialDetailViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { trialId } = useParams()
  const { instanceKey } = useEpicSession()
  const trial = getCdsTrialById(trialId) ?? getCdsBestTrial()

  const basePath = location.pathname.startsWith('/patient-dashboard')
    ? '/patient-dashboard'
    : '/provider-dashboard'

  if (!trial) {
    return null
  }

  const serviceRequest = getTrialCardServiceRequest(trial)

  return (
    <ClinicalTrialFlowLayout
      title="Trial Details"
      subtitle="API response details for the selected trial card."
      onClose={() => navigate(`${basePath}${buildClinicalTrialSearch(instanceKey)}`)}
      embedded={embedded}
      footer={
        <>
          <button
            type="button"
            className="trial-flow-footer-button trial-flow-footer-button--secondary"
            onClick={() => navigate(`${basePath}/trial-matches${buildClinicalTrialSearch(instanceKey)}`)}
          >
            Back to Matches
          </button>
          <button
            type="button"
            className="trial-flow-footer-button"
            onClick={() =>
              navigate(
                `${basePath}/refer-coordinator${buildClinicalTrialSearch(
                  instanceKey,
                  getTrialCardId(trial),
                )}`,
              )
            }
          >
            Refer Coordinator
          </button>
        </>
      }
    >
      <section className="trial-detail-hero">
        <div className="trial-detail-hero-copy">
          <h2>{trial.summary}</h2>
          {trial.detail ? <p>{trial.detail}</p> : null}
        </div>

        <div className="trial-detail-meta-card">
          {trial.source?.label ? (
            <div>
              <span className="trial-stat-label">Source</span>
              <strong>{trial.source.label}</strong>
            </div>
          ) : null}
          {trial.source?.url ? (
            <div>
              <span className="trial-stat-label">Source URL</span>
              <strong>{trial.source.url}</strong>
            </div>
          ) : null}
          {serviceRequest.authoredOn ? (
            <div>
              <span className="trial-stat-label">Authored On</span>
              <strong>{serviceRequest.authoredOn}</strong>
            </div>
          ) : null}
          {serviceRequest.performerDisplay ? (
            <div>
              <span className="trial-stat-label">Performer</span>
              <strong>{serviceRequest.performerDisplay}</strong>
            </div>
          ) : null}
        </div>
      </section>

      <section className="trial-detail-grid">
        <article className="trial-detail-card">
          <h3>Summary</h3>
          <p>{trial.summary}</p>
        </article>

        <article className="trial-detail-card">
          <h3>Detail</h3>
          <p>{trial.detail || 'No detail returned.'}</p>
        </article>

        {trial.suggestions?.length ? (
          <article className="trial-detail-card">
            <h3>Suggestions</h3>
            <ul className="trial-detail-bullets">
              {trial.suggestions.map((suggestion) => (
                <li key={suggestion.uuid || suggestion.label}>{suggestion.label || suggestion.uuid || 'Suggestion'}</li>
              ))}
            </ul>
          </article>
        ) : null}

        {(serviceRequest.description || serviceRequest.patientReference || serviceRequest.episodeOfCareReference) ? (
          <article className="trial-detail-card">
            <h3>Service Request</h3>
            <ul className="trial-detail-bullets">
              {serviceRequest.description ? <li>{serviceRequest.description}</li> : null}
              {serviceRequest.patientReference ? <li>{serviceRequest.patientReference}</li> : null}
              {serviceRequest.episodeOfCareReference ? <li>{serviceRequest.episodeOfCareReference}</li> : null}
            </ul>
          </article>
        ) : null}
      </section>
    </ClinicalTrialFlowLayout>
  )
}

function ClinicalTrialDetailPage() {
  return <ClinicalTrialDetailView />
}

export default ClinicalTrialDetailPage
