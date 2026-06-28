importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Public Firebase config — safe to embed in service worker
firebase.initializeApp({
  apiKey: 'AIzaSyCDCEmraZzbVT_gWWdcdAfjfW6oIByW8Og',
  authDomain: 'low-carbon-alerts-b2b77.firebaseapp.com',
  projectId: 'low-carbon-alerts-b2b77',
  messagingSenderId: '1069193144292',
  appId: '1:1069193144292:web:47f158d520b008e54ac9f1'
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'New notification'
  const body = payload.notification?.body ?? ''
  const messageId = payload.data?.messageId ?? ''

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { messageId },
    requireInteraction: false
  })
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
