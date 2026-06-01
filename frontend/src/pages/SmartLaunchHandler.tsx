import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { initiateSmartLaunch } from '../api/smartLaunchService'

/**
 * SmartLaunchHandler
 *
 * Rendered when the EHR opens the app with ?iss=...&launch=... query params.
 * Sends these to the backend, which discovers the FHIR server's auth endpoints
 * and returns an authorization URL. This component then redirects the browser.
 */
function SmartLaunchHandler() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Initializing SMART launch...')
  const launchStarted = useRef(false)

  const iss = searchParams.get('iss') || ''
  const launch = searchParams.get('launch') || ''

  useEffect(() => {
    if (launchStarted.current) return
    launchStarted.current = true

    async function doLaunch() {
      try {
        setStatus('Discovering FHIR server configuration...')

        const authorizeUrl = await initiateSmartLaunch(iss, launch)

        setStatus('Redirecting to authorization server...')

        // Small delay so the user can see the status
        setTimeout(() => {
          window.location.href = authorizeUrl
        }, 300)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'SMART launch failed.'
        setError(message)
        setStatus('')
      }
    }

    doLaunch()
  }, [iss, launch])

  return (
    <main className="page-shell landing-shell">
      <header className="brand-bar">
        <div className="brand-lockup">
          <div className="brand-mark">EP</div>
          <div className="brand-copy">
            <span className="brand-eyebrow">Epic EHR</span>
            <span className="brand-title">SMART on FHIR Launch</span>
          </div>
        </div>
      </header>

      <section className="surface hero-card login-card">
        <span className="eyebrow-pill">EHR Launch</span>

        {error ? (
          <>
            <h1 className="hero-title" style={{ color: 'var(--danger, #ef4444)' }}>
              Launch Failed
            </h1>
            <p className="hero-copy">{error}</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  window.location.href = '/'
                }}
              >
                Go to Home
              </button>
            </div>
            <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', opacity: 0.7, fontSize: '0.85rem' }}>
                Debug info
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
{`ISS: ${iss}
Launch: ${launch}
Error: ${error}`}
              </pre>
            </details>
          </>
        ) : (
          <>
            <h1 className="hero-title">Launching from EHR...</h1>
            <p className="hero-copy">{status}</p>
            <div
              style={{
                marginTop: '2rem',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  border: '3px solid rgba(255, 255, 255, 0.15)',
                  borderTopColor: 'var(--accent, #6366f1)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          </>
        )}
      </section>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

export default SmartLaunchHandler
