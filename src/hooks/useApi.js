import { useState, useEffect, useCallback } from 'react'

/**
 * useApi — fetch data from an API function on mount and on manual refresh
 * @param {Function} apiFn — async function that returns data
 * @param {Array} deps — extra dependencies to re-fetch on
 */
export function useApi(apiFn, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFn()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
