import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import PatientDashboard from './pages/PatientDashboard'
import ProviderDashboard from './pages/ProviderDashboard'
import SmartLaunchHandler from './pages/SmartLaunchHandler'
import { useSearchParams } from 'react-router-dom'

/**
 * Root route dispatcher:
 * - If ?iss= and ?launch= are present → EHR launch flow
 * - Otherwise → normal landing page with login buttons
 */
function RootRoute() {
  const [searchParams] = useSearchParams()
  const iss = searchParams.get('iss')
  const launch = searchParams.get('launch')

  if (iss && launch) {
    return <SmartLaunchHandler />
  }

  return <LandingPage />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/provider-dashboard" element={<ProviderDashboard />} />
        <Route path="/provider-dashboard/trial-matches" element={<ProviderDashboard />} />
        <Route path="/provider-dashboard/trial-matches/:trialId" element={<ProviderDashboard />} />
        <Route path="/provider-dashboard/refer-coordinator" element={<ProviderDashboard />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/patient-dashboard/trial-matches" element={<PatientDashboard />} />
        <Route path="/patient-dashboard/trial-matches/:trialId" element={<PatientDashboard />} />
        <Route path="/patient-dashboard/refer-coordinator" element={<PatientDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
