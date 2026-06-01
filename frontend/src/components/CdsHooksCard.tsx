import type { CdsCard, CdsCardLink } from '../utils/epicSession'

type CdsHooksCardProps = {
  card: CdsCard
  onDismiss: (cardId: string) => void
}

function getCardIndicator(indicator: string | undefined) {
  if (indicator === 'critical') {
    return 'critical'
  }

  if (indicator === 'warning') {
    return 'warning'
  }

  return 'information'
}

function getVisibleLinks(links: CdsCard['links']) {
  if (!Array.isArray(links)) {
    return []
  }

  return links.filter(
    (link): link is CdsCardLink =>
      !!link &&
      typeof link.label === 'string' &&
      !!link.label.trim() &&
      typeof link.url === 'string' &&
      !!link.url.trim() &&
      (link.type === 'absolute' || link.type === 'smart'),
  )
}

function CdsHooksCard({ card, onDismiss }: CdsHooksCardProps) {
  const indicator = getCardIndicator(card.indicator)
  const actionLinks = getVisibleLinks(card.links)

  return (
    <article className={`surface cds-response-card cds-response-card--${indicator}`}>
      <div className="cds-response-header">
        <div className="cds-response-indicator">
          <span className="cds-response-indicator-icon" aria-hidden="true">
            i
          </span>
          <span className="cds-response-indicator-label">{indicator}</span>
        </div>
        <button
          type="button"
          className="secondary-button cds-response-dismiss"
          onClick={() => onDismiss(card.uuid)}
        >
          Dismiss
        </button>
      </div>
      <h2 className="cds-response-title">{card.summary || 'Clinical decision support'}</h2>
      <p className="cds-response-detail">{card.detail || 'No detail returned.'}</p>
      {actionLinks.length > 0 ? (
        <div className="cds-response-actions">
          {actionLinks.map((link) => (
            <a
              key={`${card.uuid}-${link.label}-${link.type}`}
              className="primary-button cds-response-action-link"
              href={link.url}
              target={link.type === 'absolute' ? '_blank' : undefined}
              rel={link.type === 'absolute' ? 'noreferrer' : undefined}
              title={
                link.type === 'smart'
                  ? 'This SMART link is intended to be launched by the EHR with Epic launch context.'
                  : undefined
              }
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
      <p className="cds-response-source">
        Source: <span>{card.source?.label || 'Unknown source'}</span>
      </p>
    </article>
  )
}

export default CdsHooksCard
