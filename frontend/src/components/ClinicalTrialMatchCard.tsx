import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  type CdsTrialCard,
  getCdsTrials,
  getTrialCardId,
  isCdsTrialCard,
  setCdsTrials,
} from '../data/mockClinicalTrials'
import { buildClinicalTrialSearch } from '../utils/clinicalTrialRoutes'

type ClinicalTrialMatchCardProps = {
  instanceKey?: string
  trialCards?: CdsTrialCard[]
  onDismiss: () => void
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.25V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.25" r="1.15" fill="currentColor" />
    </svg>
  )
}

function IconMegaphone() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 13.5V10.5C4.5 9.67 5.17 9 6 9H8.5L15.75 5.5V18.5L8.5 15H6C5.17 15 4.5 14.33 4.5 13.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 15L10 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 9.25C19.3 10.08 20 11.04 20 12C20 12.96 19.3 13.92 18 14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 12H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 12H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5.75" width="12" height="14.25" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9" y="3.25" width="6" height="4" rx="1.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.25 11H14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.25 15H14.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5L18.25 6V11.75C18.25 15.72 15.91 19.33 12 20.5C8.09 19.33 5.75 15.72 5.75 11.75V6L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.5 11.85L11.2 13.55L14.8 9.95" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 15L19.5 19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="10.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.75 18.5C5.6 15.95 7.55 14.75 9.5 14.75C11.45 14.75 13.4 15.95 14.25 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 16.75C15.74 16.33 16.54 16.1 17.35 16.1C18.49 16.1 19.65 16.56 20.45 17.55" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ClinicalTrialMatchCard({ instanceKey, trialCards, onDismiss }: ClinicalTrialMatchCardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Determine the base dashboard route depending on where this card is rendered
  const basePath = location.pathname.startsWith('/patient-dashboard')
    ? '/patient-dashboard'
    : '/provider-dashboard'

  const [trials, setTrials] = useState<CdsTrialCard[]>([])

  useEffect(() => {
    if (!trialCards || trialCards.length === 0) {
      setTrials(getCdsTrials())
      return
    }

    const trialOnly = trialCards.filter(isCdsTrialCard)

    setCdsTrials(trialOnly)
    setTrials(trialOnly)
  }, [trialCards])

  const bestMatch = trials[0]

  if (!bestMatch) {
    return null
  }

  return (
    <article className={`surface trial-alert-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`.trim()}>
      <header className="trial-alert-card-header">
        <div className="trial-alert-heading">
          <span className="trial-alert-heading-icon" aria-hidden="true">
            <IconInfo />
          </span>
          <div>
            <h3 className="trial-alert-title">{bestMatch.summary}</h3>
            {bestMatch.source?.label ? <p className="trial-alert-subtitle">{bestMatch.source.label}</p> : null}
          </div>
        </div>
        <button
          type="button"
          className="trial-alert-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss clinical trial match card"
        >
          <IconClose />
        </button>
      </header>

      <button
        type="button"
        className="trial-alert-summary-toggle"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <section className="trial-alert-section trial-alert-section--message">
          <span className="trial-alert-section-icon" aria-hidden="true">
            <IconMegaphone />
          </span>
          <div className="trial-alert-message">
            <p>{bestMatch.detail || bestMatch.summary}</p>
          </div>
        </section>
      </button>

      {isExpanded ? (
        <>
          <div className="trial-alert-card-body">
            <section className="trial-alert-best-match">
              <span className="trial-alert-section-icon trial-alert-section-icon--plain" aria-hidden="true">
                <IconTarget />
              </span>
              <div className="trial-alert-best-match-copy">
                <p className="trial-alert-best-match-title">{bestMatch.summary}</p>
                {bestMatch.detail ? <p className="trial-alert-best-match-score">{bestMatch.detail}</p> : null}
              </div>
            </section>

            {bestMatch.suggestions?.length ? (
              <section className="trial-alert-section">
                <span className="trial-alert-section-icon" aria-hidden="true">
                  <IconClipboard />
                </span>
                <div className="trial-alert-reasons">
                  <h4>Suggestions:</h4>
                  <ul>
                    {bestMatch.suggestions.map((suggestion) => (
                      <li key={suggestion.uuid || suggestion.label}>{suggestion.label || suggestion.uuid || 'Suggestion'}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            {bestMatch.source?.url || bestMatch.source?.label ? (
              <section className="trial-alert-section">
                <span className="trial-alert-section-icon" aria-hidden="true">
                  <IconShield />
                </span>
                <div className="trial-alert-reasons">
                  <h4>Source:</h4>
                  {bestMatch.source?.label ? <p>{bestMatch.source.label}</p> : null}
                  {bestMatch.source?.url ? (
                    <p>
                      <a href={bestMatch.source.url} target="_blank" rel="noreferrer">
                        {bestMatch.source.url}
                      </a>
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <footer className="trial-alert-actions">
            <button
              type="button"
              className="trial-alert-primary"
              onClick={() =>
                navigate(`${basePath}/trial-matches${buildClinicalTrialSearch(instanceKey)}`)
              }
            >
              <span className="trial-alert-button-icon" aria-hidden="true">
                <IconSearch />
              </span>
              Review Matches
            </button>

            <button
              type="button"
              className="trial-alert-secondary"
              onClick={() =>
                navigate(
                  `${basePath}/refer-coordinator${buildClinicalTrialSearch(
                    instanceKey,
                    getTrialCardId(bestMatch),
                  )}`,
                )
              }
            >
              <span className="trial-alert-button-icon" aria-hidden="true">
                <IconUsers />
              </span>
              Refer Coordinator
            </button>

            <button type="button" className="trial-alert-outline" onClick={onDismiss}>
              <span className="trial-alert-button-icon" aria-hidden="true">
                <IconClose />
              </span>
              Dismiss
            </button>
          </footer>
        </>
      ) : null}
    </article>
  )
}

export default ClinicalTrialMatchCard
