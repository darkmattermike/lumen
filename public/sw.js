// Lumen Service Worker — handles push notifications
const CACHE_NAME = 'lumen-v1'

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

// Handle incoming push
self.addEventListener('push', e => {
  if (!e.data) return

  let payload = {}
  try { payload = e.data.json() } catch { payload = { title: 'Lumen', body: e.data.text() } }

  const options = {
    body:    payload.body   || '',
    icon:    payload.icon   || '/favicon.svg',
    badge:   payload.badge  || '/favicon.svg',
    tag:     payload.tag    || 'lumen',
    data:    payload.data   || {},
    actions: payload.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: false,
  }

  e.waitUntil(
    self.registration.showNotification(payload.title || 'Lumen', options)
  )
})

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close()

  const urlToOpen = self.location.origin + '/dashboard'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If app already open, focus it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(urlToOpen)
    })
  )
})
