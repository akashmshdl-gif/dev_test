import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ClinicalTrialFlowLayout from '../components/ClinicalTrialFlowLayout'
import {
  getCdsBestTrial,
  getCdsTrials,
  getTrialCardId,
} from '../data/mockClinicalTrials'
import { useEpicSession } from '../hooks/useEpicSession'
import { buildClinicalTrialSearch } from '../utils/clinicalTrialRoutes'

type ClinicalTrialMatchesViewProps = {
  embedded?: boolean
}

export function ClinicalTrialMatchesView({ embedded = false }: ClinicalTrialMatchesViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { instanceKey } = useEpicSession()
  const [selectedTrialId, setSelectedTrialId] = useState(() => {
    const currentBestTrial = getCdsBestTrial()
    return currentBestTrial ? getTrialCardId(currentBestTrial) : ''
  })
  const bestMatch = getCdsBestTrial()
  const sortedTrials = getCdsTrials()
  
  const basePath = location.pathname.startsWith('/patient-dashboard')
    ? '/patient-dashboard'
    : '/provider-dashboard'

  if (!bestMatch) {
    return null
  }

  return (
    <ClinicalTrialFlowLayout
      title="Review Matches"
      subtitle="Response returned by the trial matches API."
      onClose={() => navigate(`${basePath}${buildClinicalTrialSearch(instanceKey)}`)}
      embedded={embedded}
      footer={
        <>
          <button
            type="button"
            className="trial-flow-footer-button"
            onClick={() => navigate(`${basePath}${buildClinicalTrialSearch(instanceKey)}`)}
          >
            Close
          </button>
        </>
      }
    >

      <section className="trial-match-list-section">
        <div className="trial-match-list-header">
          <div>
            <h2>Matched Trials ({getCdsTrials().length})</h2>
          </div>
        </div>

        <div className="trial-match-list">
          {sortedTrials.map((trial, index) => {
            const trialId = getTrialCardId(trial)

            return (
              <article
                key={trialId}
                className={`trial-match-row ${selectedTrialId === trialId ? 'trial-match-row--selected' : ''}`.trim()}
                role="button"
                tabIndex={0}
                aria-pressed={selectedTrialId === trialId}
                onClick={() => setSelectedTrialId(trialId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedTrialId(trialId)
                  }
                }}
              >
                <div className="trial-match-row-top">
                  <div className="trial-match-row-title-group">
                    <span className="trial-match-rank">{index + 1}</span>
                    <div>
                      <div className="trial-match-title-line">
                        <h3>{trial.summary}</h3>
                      </div>
                      {trial.detail ? <p className="trial-match-sponsor">{trial.detail}</p> : null}
                      {trial.source?.label ? <p className="trial-match-sponsor">Source: {trial.source.label}</p> : null}
                      {trial.source?.url ? (
                        <p className="trial-match-sponsor">
                          <a href={trial.source.url} target="_blank" rel="noreferrer">
                            {trial.source.url}
                          </a>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {trial.suggestions?.length ? (
                  <div className="trial-match-stats">
                    <div>
                      <span className="trial-stat-label">Suggestions</span>
                      <strong>{trial.suggestions.length}</strong>
                    </div>
                  </div>
                ) : null}

                <div className="trial-match-row-bottom">
                  <div className="trial-reason-list">
                    {(trial.suggestions ?? []).map((suggestion) => (
                      <span key={suggestion.uuid || suggestion.label} className="trial-reason-item">
                        {suggestion.label || suggestion.uuid || 'Suggestion'}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      className="trial-link-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(
                          `${basePath}/refer-coordinator${buildClinicalTrialSearch(
                            instanceKey,
                            trialId,
                          )}`,
                        )
                      }}
                    >
                      Refer Coordinator
                    </button>
                    <button
                      type="button"
                      className="trial-link-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(
                          `${basePath}/trial-matches/${trialId}${buildClinicalTrialSearch(
                            instanceKey,
                          )}`,
                        )
                      }}
                    >
                      View details
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </ClinicalTrialFlowLayout>
  )
}

function ClinicalTrialMatchesPage() {
  return <ClinicalTrialMatchesView />
}

export default ClinicalTrialMatchesPage
