import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEpicSession } from '../hooks/useEpicSession'
import { getSessionDashboardPath } from '../utils/epicSession'

function Dashboard() {
  const navigate = useNavigate()
  const { session, instanceKey } = useEpicSession()

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true })
      return
    }
    const instanceSearch = instanceKey ? `?instanceKey=${encodeURIComponent(instanceKey)}` : ''
    navigate(`${getSessionDashboardPath(session)}${instanceSearch}`, { replace: true })
  }, [instanceKey, navigate, session])

  return null
}

export default Dashboard
