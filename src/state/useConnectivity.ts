import { useCallback, useEffect, useState } from 'react'
import { checkAllConnectivity, type ConnectivityStatuses } from '../lib/connectivity'

const CHECKING: ConnectivityStatuses = { app: 'checking', network: 'checking', claudeApi: 'checking' }

/** Article 44 — runs the three connectivity checks once on mount, and
 * exposes `recheck` so a pull-to-refresh gesture (or anything else) can
 * manually re-run them without waiting for any automatic cycle. */
export function useConnectivity() {
  const [statuses, setStatuses] = useState<ConnectivityStatuses>(CHECKING)

  const recheck = useCallback(async () => {
    setStatuses(CHECKING)
    const result = await checkAllConnectivity()
    setStatuses(result)
  }, [])

  useEffect(() => {
    recheck()
  }, [recheck])

  return { statuses, recheck }
}
