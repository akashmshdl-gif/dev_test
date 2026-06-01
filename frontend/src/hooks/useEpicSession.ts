import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  clearEpicSessionStorage,
  getEpicInstanceKey,
  getStoredEpicSession,
  parseEpicSession,
  storeEpicSession,
  type EpicSessionData,
} from '../utils/epicSession'

export function useEpicSession() {
  const location = useLocation()
  const navigate = useNavigate()
  const querySession = useMemo(
    () => parseEpicSession(location.search),
    [location.search],
  )
  const instanceKey = useMemo(
    () => getEpicInstanceKey(location.search) || querySession?.instanceKey || '',
    [location.search, querySession],
  )

  useEffect(() => {
    if (querySession) {
      storeEpicSession(querySession)
      navigate(
        {
          pathname: location.pathname,
          search: instanceKey ? `?instanceKey=${encodeURIComponent(instanceKey)}` : '',
        },
        { replace: true },
      )
    }
  }, [instanceKey, location.pathname, navigate, querySession])

  const session: EpicSessionData | null = querySession ?? getStoredEpicSession(instanceKey)

  return {
    session,
    instanceKey,
    clearSession: () => {
      clearEpicSessionStorage()
    },
  }
}
