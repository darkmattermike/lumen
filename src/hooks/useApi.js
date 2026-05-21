import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useApi — stale-while-revalidate data fetching.
 * - Shows cached data immediately (no loading flash for repeat visits)
 * - Silently refreshes in the background
 * - Falls back to loading state only on first-ever fetch
 */

const cache = new Map() // in-memory cache, lives for the browser session

export function useApi(apiFn, deps = []) {
  const cacheKey = apiFn.toString().slice(0, 120)

  const [data, setData]       = useState(() => cache.get(cacheKey) ?? null)
  const [loading, setLoading] = useState(() => !cache.has(cacheKey))
  const [error, setError]     = useState(null)
  const mounted = useRef(true)

  const fetch = useCallback((opts = {}) => {
    const { silent = false } = opts
    if (!silent) setError(null)

    return apiFn()
      .then(result => {
        if (!mounted.current) return
        cache.set(cacheKey, result)
        setData(result)
        setLoading(false)
      })
      .catch(err => {
        if (!mounted.current) return
        setError(err.message)
        setLoading(false)
      })
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mounted.current = true
    // If we have cached data, refresh silently in background
    if (cache.has(cacheKey)) {
      fetch({ silent: true })
    } else {
      fetch()
    }
    return () => { mounted.current = false }
  }, [fetch])

  const refresh = useCallback(() => fetch(), [fetch])

  return { data, loading, error, refresh }
}
