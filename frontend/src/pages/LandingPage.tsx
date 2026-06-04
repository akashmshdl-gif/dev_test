import { useEffect, useState } from 'react'
import { getPatientLoginUrl, getProviderLoginUrl } from '../api/authService'

const SMART_LAUNCH_URL = 'https://launch.smarthealthit.org/provider-login?response_type=code&client_id=7a0ab108-2d5e-4437-bf73-b2be1e540105&redirect_uri=https%3A%2F%2Fdev-test-backend.vercel.app%2Fapi%2Fauth%2Fsmart-callback&launch=WzAsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCJodHRwczovL2Rldi10ZXN0LWJhY2tlbmQudmVyY2VsLmFwcC9hcGkvYXV0aC9zbWFydC1jYWxsYmFjayIsIjdhMGFiMTA4LTJkNWUtNDQzNy1iZjczLWIyYmUxZTU0MDEwNSIsInVXdHJ2aU5KOTl0bE96Q0kzbjQzS2tHNmEzSEo1K3d6aitDSjBGSUI5U2lJbi9PU1UyTHp1OGh5NEFTTVkvL3ZiMkFNbDNxSGhRNXJlZFZCanVPQXd3PT0iLCIiLCJodHRwczovL2FwcGVwaWMudGhlZGV2bG9naXguY29tL3Byb3ZpZGVyLy53ZWxsLWtub3duL2p3a3MuanNvbiIsIntcbiAgXCJrZXlzXCI6IFtcbiAgICB7XG4gICAgICBcImt0eVwiOiBcIlJTQVwiLFxuICAgICAgXCJraWRcIjogXCJjYjExM2IwMC1kZDAwLTQzY2MtOGQ0Yy01YjI0YWVkZDVhMWRcIixcbiAgICAgIFwidXNlXCI6IFwic2lnXCIsXG4gICAgICBcImFsZ1wiOiBcIlJTMzg0XCIsXG4gICAgICBcIm5cIjogXCJ6VHRnM19feEtUODYtaGs1SWMzRkVENG1JNUhSTWRONzI2N2JXbUdJeGJ0SWFJZ0hxbjhWcHJfUmo5XzdrMV8zUGtOYjFzUWJFRUI3NXEtV1puRkpRd1ZfWUlFalZzQTREMThGSGRUR3BBdEZqaXdIczd5OTZPaC12N2pPMXA1dkN2ano3QWtBMDFLQy15dVRiWERxbWxLSTFuNkNjWTRZOEJTRTNMQW50bkdVYUpZVi1uTEdZQUp1S3FKS0tiQVlFVDM5WFVTT1EwQU9LSkpXZlFUWGpseW5pcm5Ec3JvX0wzdkk1d05zakFfb0FIRFZBNS1NM21DQmNBZWNLaHNSanY2RmxTbDBXWm5uNzJxT2ZwcUVVTVlERkV4emtSV1p1YnFxcGR5VWp6VkpIcElGWHN6Q2ZKY0NyeFpzNHB0WGJNWGNOUFU2UFFOYUd1VU9fTlg0Z3dcIixcbiAgICAgIFwiZVwiOiBcIkFRQUJcIlxuICAgIH1cbiAgXVxufSIsMiwyLCIiXQ+%5C&scope=openid+fhirUser+launch+user%2FPatient.read+user%2FPractitioner.read+user%2FCondition.read+user%2FObservation.read+user%2FMedicationRequest.read+user%2FDocumentReference.read+user%2FBinary.read&state=5c124f17-a7d7-420f-91de-c6aca568bf54&aud=https%3A%2F%2Flaunch.smarthealthit.org%2Fv%2Fr4%2Ffhir&code_challenge=gc4gOwYlfpaeJnsLRqmQDeYnpNoY5GQwFGIyMstObx0&code_challenge_method=S256&login_type=provider'

function LandingPage() {
  const [loadingAuthType, setLoadingAuthType] = useState<'patient' | 'provider' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Firefox can restore this page from bfcache when the user backs out of Epic,
    // which preserves the old "Connecting..." button state unless we clear it here.
    const resetPendingAuthState = () => {
      setLoadingAuthType(null)
    }

    window.addEventListener('pageshow', resetPendingAuthState)

    return () => {
      window.removeEventListener('pageshow', resetPendingAuthState)
    }
  }, [])

  const launchEpicLogin = async (
    authType: 'patient' | 'provider',
    getLoginUrl: () => Promise<string>,
  ) => {
    setLoadingAuthType(authType)
    setErrorMessage('')

    try {
      const url = await getLoginUrl()
      window.location.href = url
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to connect to Epic right now.'

      setErrorMessage(message)
      setLoadingAuthType(null)
    }
  }

  return (
    <main className="landing-marketing-shell">
      <header className="landing-marketing-header">
        <div className="landing-marketing-brand">
          {/* <UlaloLogo /> */}
        </div>

        <div className="landing-marketing-header-right">
          <div className="landing-marketing-actions">
            <button
              type="button"
              className="primary-button landing-auth-button"
              onClick={() => window.location.assign(SMART_LAUNCH_URL)}
              disabled={loadingAuthType !== null}
            >
              Smart Launch
            </button>
            <button
              type="button"
              className="primary-button landing-auth-button"
              onClick={() => launchEpicLogin('patient', getPatientLoginUrl)}
              disabled={loadingAuthType !== null}
            >
              {loadingAuthType === 'patient' ? 'Connecting...' : 'Patient Login'}
            </button>
            <button
              type="button"
              className="primary-button landing-auth-button"
              onClick={() => launchEpicLogin('provider', getProviderLoginUrl)}
              disabled={loadingAuthType !== null}
            >
              {loadingAuthType === 'provider' ? 'Connecting...' : 'Epic on FHIR'}
            </button>
          </div>
        </div>
      </header>

      <section className="landing-marketing-hero">
        <h1 className="landing-marketing-title">
          <span>Own and Manage Your Health Data</span>
          <span className="landing-marketing-title-accent">YOUR WAY</span>
        </h1>
        {errorMessage ? <p className="error-banner landing-error-banner">{errorMessage}</p> : null}
      </section>
    </main>
  )
}

export default LandingPage
