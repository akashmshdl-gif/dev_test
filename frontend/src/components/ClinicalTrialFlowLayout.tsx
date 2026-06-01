import type { ReactNode } from 'react'

type ClinicalTrialFlowLayoutProps = {
  title: string
  subtitle: string
  onClose: () => void
  footer?: ReactNode
  embedded?: boolean
  children: ReactNode
}

function ClinicalTrialFlowLayout({
  title,
  subtitle,
  onClose,
  footer,
  embedded = false,
  children,
}: ClinicalTrialFlowLayoutProps) {
  if (embedded) {
    return (
      <section className="surface trial-flow-panel trial-flow-panel--embedded">
        <header className="trial-flow-header">
          <div className="trial-flow-heading">
            <span className="trial-flow-heading-icon" aria-hidden="true">
              i
            </span>
            <div>
              <h1 className="trial-flow-title">{title}</h1>
              <p className="trial-flow-subtitle">{subtitle}</p>
            </div>
          </div>
          {/* <button
            type="button"
            className="trial-flow-close"
            onClick={onClose}
            aria-label="Close clinical trial flow"
          >
            x
          </button> */}
        </header>

        <div className="trial-flow-body">{children}</div>

        {footer ? <footer className="trial-flow-footer">{footer}</footer> : null}
      </section>
    )
  }

  return (
    <div className="trial-flow-shell">
      <div className="trial-flow-backdrop" />
      <section className="surface trial-flow-panel">
        <header className="trial-flow-header">
          <div className="trial-flow-heading">
            <span className="trial-flow-heading-icon" aria-hidden="true">
              i
            </span>
            <div>
              <h1 className="trial-flow-title">{title}</h1>
              <p className="trial-flow-subtitle">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="trial-flow-close"
            onClick={onClose}
            aria-label="Close clinical trial flow"
          >
            x
          </button>
        </header>

        <div className="trial-flow-body">{children}</div>

        {footer ? <footer className="trial-flow-footer">{footer}</footer> : null}
      </section>
    </div>
  )
}

export default ClinicalTrialFlowLayout
