import { useEffect, useState } from 'react'
import { getPatientLoginUrl, getProviderLoginUrl } from '../api/authService'

const SMART_LAUNCH_URL = 'https://teams.live.com/l/message/19:uni01_qwr2vrnrujixukau4gn7npi2vvsyey44fkep3bq72tgnnonp3aiq@thread.v2/1780485688254?context=%7B%22contextType%22%3A%22chat%22%7D'
  // 'https://launch.smarthealthit.org/ehr?app=https%3A%2F%2Fappepic.thedevlogix.com%2F%3Fiss%3Dhttps%253A%252F%252Flaunch.smarthealthit.org%252Fv%252Fr4%252Ffhir%26launch%3DWzAsIiIsIiIsIkFVVE8iLDAsMCwxLCIiLCJodHRwczovL2FwcGVwaWMudGhlZGV2bG9naXguY29tL2FwaS9hdXRoL3NtYXJ0LWNhbGxiYWNrIiwiN2EwYWIxMDgtMmQ1ZS00NDM3LWJmNzMtYjJiZTFlNTQwMTA1IiwidVd0cnZpTko5OXRsT3pDSTNuNDNLa0c2YTNISjUrd3pqK0NKMEZJQjlTaUluL09TVTJMenU4aHk0QVNNWS8vdmIyQU1sM3FIaFE1cmVkVkJqdU9Bd3c9PSIsIiIsImh0dHBzOi8vYXBwZXBpYy50aGVkZXZsb2dpeC5jb20vcHJvdmlkZXIvLndlbGwta25vd24vandrcy5qc29uIiwie1xuICBcImtleXNcIjogW1xuICAgIHtcbiAgICAgIFwia3R5XCI6IFwiUlNBXCIsXG4gICAgICBcImtpZFwiOiBcImNiMTEzYjAwLWRkMDAtNDNjYy04ZDRjLTViMjRhZWRkNWExZFwiLFxuICAgICAgXCJ1c2VcIjogXCJzaWdcIixcbiAgICAgIFwiYWxnXCI6IFwiUlMzODRcIixcbiAgICAgIFwiblwiOiBcInpUdGczX194S1Q4Ni1oazVJYzNGRUQ0bUk1SFJNZE43MjY3YldtR0l4YnRJYUlnSHFuOFZwcl9SajlfN2sxXzNQa05iMXNRYkVFQjc1cS1XWm5GSlF3Vl9ZSUVqVnNBNEQxOEZIZFRHcEF0Rmppd0hzN3k5Nk9oLXY3ak8xcDV2Q3ZqejdBa0EwMUtDLXl1VGJYRHFtbEtJMW42Q2NZNFk4QlNFM0xBbnRuR1VhSllWLW5MR1lBSnVLcUpLS2JBWUVUMzlYVVNPUTBBT0tKSldmUVRYamx5bmlybkRzcm9fTDN2STV3TnNqQV9vQUhEVkE1LU0zbUNCY0FlY0toc1JqdjZGbFNsMFdabm43MnFPZnBxRVVNWURGRXh6a1JXWnVicXFwZHlVanpWSkhwSUZYc3pDZkpjQ3J4WnM0cHRYYk1YY05QVTZQUU5hR3VVT19OWDRnd1wiLFxuICAgICAgXCJlXCI6IFwiQVFBQlwiXG4gICAgfVxuICBdXG59IiwyLDIsIiJd'

function UlaloLogo() {
  return (
    <svg
      className="ulalo-logo"
      viewBox="0 0 125 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M79.212 26.9735L68.2991 2.72913L61.884 2.74061L74.284 32.3622L79.212 26.9735Z"
        fill="url(#paint0_linear_landing_page)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.9329 26.8459L61.6871 2.72913L68.1022 2.74061L55.3841 32.2982L50.9329 26.8459Z"
        fill="url(#paint1_linear_landing_page)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50.9329 26.8292L55.3841 32.2817H74.143L71.8638 26.8292H50.9329Z"
        fill="url(#paint2_linear_landing_page)"
      />
      <path
        d="M34.9073 29.3369H45.2989V32.4974H31.0318V2.72913H34.9073V29.3369ZM5.52762 2.72913V21.5638C5.52762 24.2118 6.17353 26.1764 7.46539 27.4576C8.75724 28.739 10.553 29.3796 12.8528 29.3796C15.1241 29.3796 16.9057 28.739 18.1976 27.4576C19.4895 26.1764 20.1354 24.2118 20.1354 21.5638V2.72913H24.0109V21.5211C24.0109 23.9982 23.514 26.0839 22.5203 27.778C21.5266 29.4721 20.185 30.732 18.4957 31.5577C16.8064 32.3836 14.9112 32.7963 12.8102 32.7963C10.7092 32.7963 8.81399 32.3836 7.12468 31.5577C5.43531 30.732 4.10093 29.4721 3.12138 27.778C2.14186 26.0839 1.6521 23.9982 1.6521 21.5211V2.72913H5.52762Z"
        fill="white"
      />
      <path
        d="M102.702 16.7926C102.702 11.8953 103.496 8.07279 105.087 5.32515C106.676 2.57755 109.459 1.20374 113.434 1.20374C117.38 1.20374 120.148 2.57755 121.738 5.32515C123.329 8.07279 124.123 11.8953 124.123 16.7926C124.123 21.7753 123.329 25.6476 121.738 28.4095C120.148 31.1713 117.38 32.5522 113.434 32.5522C109.459 32.5522 106.676 31.1713 105.087 28.4095C103.496 25.6476 102.702 21.7753 102.702 16.7926ZM120.29 16.7926C120.29 14.3154 120.127 12.2156 119.801 10.493C119.474 8.77034 118.807 7.38231 117.799 6.32881C116.791 5.27535 115.336 4.7486 113.434 4.7486C111.503 4.7486 110.034 5.27535 109.026 6.32881C108.018 7.38234 107.351 8.77034 107.024 10.493C106.698 12.2156 106.534 14.3154 106.534 16.7926C106.534 19.3551 106.698 21.5048 107.024 23.2416C107.351 24.9785 108.018 26.3736 109.026 27.4271C110.034 28.4806 111.503 29.0073 113.434 29.0073C115.336 29.0073 116.791 28.4806 117.799 27.4271C118.807 26.3736 119.474 24.9785 119.801 23.2416C120.127 21.5048 120.29 19.3551 120.29 16.7926ZM88.2702 29.3917H98.6618V32.5522H84.3947V2.78397H88.2702V29.3917Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_landing_page"
          x1="70.5479"
          y1="32.3622"
          x2="70.5479"
          y2="2.72913"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8DF3B2" />
          <stop offset="1" stopColor="#1BE866" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_landing_page"
          x1="59.5174"
          y1="32.2982"
          x2="59.5174"
          y2="2.72913"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1BE866" />
          <stop offset="1" stopColor="#8DF3B2" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_landing_page"
          x1="50.9329"
          y1="26.8292"
          x2="74.143"
          y2="26.8292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#8DF3B2" />
          <stop offset="1" stopColor="#1BE866" />
        </linearGradient>
      </defs>
    </svg>
  )
}

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
          <UlaloLogo />
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
