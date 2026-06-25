importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Replaced at runtime via firebase.client.ts postMessage, or hardcoded here for SW context
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config)
    const messaging = firebase.messaging()
    messaging.onBackgroundMessage((payload) => {
      self.registration.showNotification(
        payload.notification?.title ?? 'New notification',
        {
          body: payload.notification?.body ?? '',
          icon: '/favicon.ico',
          data: payload.data
        }
      )
    })
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) return client.focus()
      }
      return clients.openWindow('/app')
    })
  )
})
