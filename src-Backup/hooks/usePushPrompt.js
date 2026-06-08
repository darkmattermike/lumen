/**
 * usePushPrompt
 * After onboarding, if the user hasn't granted push permission yet,
 * shows a one-time prompt banner. Never asks twice.
 */
import { useState, useEffect } from 'react'
import { api } from '../data/api'

const STORAGE_KEY = 'lumen_push_prompted'

export function usePushPrompt() {
  const [show, setShow] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [done, setDone]   = useState(false)

  useEffect(() => {
    // Don't show if: already prompted, push not supported, already granted
    if (localStorage.getItem(STORAGE_KEY)) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted') {
      localStorage.setItem(STORAGE_KEY, '1')
      return
    }
    if (Notification.permission === 'denied') {
      localStorage.setItem(STORAGE_KEY, '1')
      return
    }
    // Show after a 3s delay so page has loaded
    const t = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(t)
  }, [])

  async function enable() {
    setEnabling(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready
        const { publicKey } = await api.vapidKey()
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        const json = sub.toJSON()
        await api.pushSubscribe({ endpoint: json.endpoint, keys: json.keys })
        setDone(true)
      }
    } catch (err) {
      console.warn('[Push]', err.message)
    }
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
    setEnabling(false)
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  return { show, done, enabling, enable, dismiss }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
