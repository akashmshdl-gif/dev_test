import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import ClinicalTrialFlowLayout from '../components/ClinicalTrialFlowLayout'
import {
  getCdsBestTrial,
  getCdsTrialById,
  getTrialCardServiceRequest,
} from '../data/mockClinicalTrials'
import { useEpicSession } from '../hooks/useEpicSession'
import { buildClinicalTrialSearch } from '../utils/clinicalTrialRoutes'

type ClinicalTrialReferralViewProps = {
  embedded?: boolean
}

export function ClinicalTrialReferralView({ embedded = false }: ClinicalTrialReferralViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { instanceKey } = useEpicSession()
  const [searchParams] = useSearchParams()
  const selectedTrialId = searchParams.get('trialId') || undefined
  const trial = getCdsTrialById(selectedTrialId) ?? getCdsBestTrial()
  if (!trial) {
    return null
  }
  
  const basePath = location.pathname.startsWith('/patient-dashboard')
    ? '/patient-dashboard'
    : '/provider-dashboard'
  const serviceRequest = getTrialCardServiceRequest(trial)
  const [reason, setReason] = useState(serviceRequest.description || '')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    setSubmitted(true)
  }

  return (
    <ClinicalTrialFlowLayout
      title="Refer to Coordinator"
      subtitle="Response-backed referral data for the selected trial card."
      onClose={() => navigate(`${basePath}${buildClinicalTrialSearch(instanceKey)}`)}
      embedded={embedded}
      footer={
        <>
          <button
            type="button"
            className="trial-flow-footer-button trial-flow-footer-button--secondary"
            onClick={() => navigate(`${basePath}${buildClinicalTrialSearch(instanceKey)}`)}
          >
            Cancel
          </button>
          <button type="button" className="trial-flow-footer-button" onClick={handleSubmit}>
            Send Referral
          </button>
        </>
      }
    >
      <section className="trial-referral-selected">
        <div className="trial-referral-selected-icon" aria-hidden="true">
          O
        </div>
        <div className="trial-referral-selected-copy">
          <span className="trial-referral-selected-label">Selected Trial</span>
          <h2>{trial.summary}</h2>
          <p>{trial.summary}</p>
          {trial.detail ? <p>{trial.detail}</p> : null}
        </div>
      </section>

      <section className="trial-form-section">
        <h3>Service Request</h3>
        <div className="trial-patient-grid">
          {serviceRequest.patientReference ? (
            <div>
              <span className="trial-stat-label">Patient Reference</span>
              <strong>{serviceRequest.patientReference}</strong>
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
          {serviceRequest.episodeOfCareReference ? (
            <div>
              <span className="trial-stat-label">Episode Of Care</span>
              <strong>{serviceRequest.episodeOfCareReference}</strong>
            </div>
          ) : null}
        </div>

        {serviceRequest.description ? <div className="trial-referral-note">{serviceRequest.description}</div> : null}

        <button
          type="button"
          className="trial-link-button trial-link-button--inline"
          onClick={() => navigate(`${basePath}${buildClinicalTrialSearch(instanceKey)}`)}
        >
          View patient chart
        </button>
      </section>

      {trial.source?.label || trial.source?.url ? (
        <section className="trial-form-section">
          <h3>Source</h3>
          <div className="trial-form-grid">
            {trial.source?.label ? (
              <label className="field-group">
                <span className="field-label">Label</span>
                <input className="field-input" value={trial.source.label} readOnly />
              </label>
            ) : null}

            {trial.source?.url ? (
              <label className="field-group">
                <span className="field-label">URL</span>
                <input className="field-input" value={trial.source.url} readOnly />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="trial-form-section">
        <h3>Suggestion</h3>
        <div className="trial-form-grid trial-form-grid--single">
          <label className="field-group">
            <span className="field-label">Description</span>
            <input className="field-input" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>

          <label className="field-group">
            <span className="field-label">Additional notes (optional)</span>
            <textarea
              className="field-input trial-notes-input"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any additional information for the coordinator..."
            />
            <span className="trial-note-count">{notes.length}/500</span>
          </label>
        </div>
      </section>

      {submitted ? (
        <div className="trial-referral-success">
          Referral view is showing API response data only.
        </div>
      ) : null}
    </ClinicalTrialFlowLayout>
  )
}

function ClinicalTrialReferralPage() {
  return <ClinicalTrialReferralView />
}

export default ClinicalTrialReferralPage
