type DetailRow = {
  label: string
  value: string
  htmlContent?: string
}

interface DataCardProps {
  title: string
  description: string
  rows?: DetailRow[]
  data?: unknown
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
  badge?: string
}

function DataCard({
  title,
  description,
  rows,
  data,
  className = '',
  collapsible = false,
  defaultOpen = false,
  badge,
}: DataCardProps) {
  const content = (
    <>
      <h2 className="section-title">{title}</h2>
      <p className="section-copy">{description}</p>

      {rows && rows.length > 0 ? (
        <table className="data-table">
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${row.value}-${index}`}>
                <td className="table-label">{row.label}</td>
                <td className="table-value">
                  {row.htmlContent ? (
                    <details className="row-accordion">
                      <summary className="row-accordion-summary">
                        <span>{row.value}</span>
                      </summary>
                      <div
                        className="row-accordion-details"
                        dangerouslySetInnerHTML={{ __html: row.htmlContent }}
                      />
                    </details>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {typeof data !== 'undefined' ? (
        <pre className="json-block">{JSON.stringify(data, null, 2)}</pre>
      ) : null}
    </>
  )

  if (!collapsible) {
    return <section className={`surface data-card ${className}`.trim()}>{content}</section>
  }

  return (
    <details className={`surface data-card accordion-card ${className}`.trim()} open={defaultOpen}>
      <summary className="accordion-summary">
        <div className="accordion-heading">
          <h2 className="section-title">{title}</h2>
          <p className="section-copy">{description}</p>
        </div>

        <div className="accordion-meta">
          {badge ? <span className="accordion-badge">{badge}</span> : null}
          <span className="accordion-chevron" aria-hidden="true" />
        </div>
      </summary>

      <div className="accordion-content">
        {rows && rows.length > 0 ? (
          <table className="data-table">
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.label}-${row.value}-${index}`}>
                  <td className="table-label">{row.label}</td>
                  <td className="table-value">
                    {row.htmlContent ? (
                      <details className="row-accordion">
                        <summary className="row-accordion-summary">
                          <span>{row.value}</span>
                        </summary>
                        <div
                          className="row-accordion-details"
                          dangerouslySetInnerHTML={{ __html: row.htmlContent }}
                        />
                      </details>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {typeof data !== 'undefined' ? (
          <pre className="json-block">{JSON.stringify(data, null, 2)}</pre>
        ) : null}
      </div>
    </details>
  )
}

export default DataCard
