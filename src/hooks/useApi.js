import { useState, useEffect, useCallback, useRef } from 'react'

/* Simple fetch hook: loads on mount, exposes { data, loading, error, refresh }. */
export function useApi(apiFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const run = useCallback(() => {
    setError(null)
    return apiFn()
      .then((res) => { if (mounted.current) { setData(res); setLoading(false) } })
      .catch((err) => { if (mounted.current) { setError(err.message || 'Error'); setLoading(false) } })
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mounted.current = true
    run()
    return () => { mounted.current = false }
  }, [run])

  return { data, loading, error, refresh: run }
}
