import { getToken, onMessage } from 'firebase/messaging'

interface InboxMessage {
  id: string
  messageId: string
  subject: string
  body: string
  read: boolean
  createdAt: string
}

// Shared state — one instance across all composable calls
const useMessages = () => useState<InboxMessage[]>('notifications-messages', () => [])
const useInitialized = () => useState<boolean>('notifications-initialized', () => false)
const useFcmToken = () => useState<string | null>('notifications-fcm-token', () => null)

export function useNotifications() {
  const nuxtApp = useNuxtApp()
  const { user } = useUserSession()
  const config = useRuntimeConfig()
  const toast = useToast()

  const messages = useMessages()
  const initialized = useInitialized()
  const fcmToken = useFcmToken()
  const unreadCount = computed(() => messages.value.filter(m => !m.read).length)

  function prependMessage(msg: InboxMessage) {
    if (!messages.value.find(m => m.id === msg.id)) {
      messages.value = [msg, ...messages.value]
    }
  }

  async function loadInbox() {
    if (!user.value) return
    const data = await $fetch<InboxMessage[]>('/api/notifications/inbox')
    messages.value = data
  }

  function connectSSE() {
    if (!import.meta.client || !user.value) return
    const es = new EventSource('/api/notifications/stream')
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { id: string, subject: string, body: string, createdAt: string }
        const msg: InboxMessage = {
          id: data.id,
          messageId: data.id,
          subject: data.subject,
          body: data.body,
          read: false,
          createdAt: data.createdAt
        }
        prependMessage(msg)
        toast.add({
          title: msg.subject,
          description: msg.body,
          color: 'primary',
          icon: 'i-lucide-bell',
          duration: 6000
        })
      } catch { /* heartbeat or malformed — ignore */ }
    }
    // Clean up when the Nuxt app unmounts (page navigation handled by persistent layout)
    nuxtApp.hook('app:beforeMount', () => es.close())
  }

  async function registerFCM() {
    if (!import.meta.client) return
    const $firebaseMessaging = nuxtApp.$firebaseMessaging as ReturnType<typeof import('firebase/messaging').getMessaging> | undefined
    if (!$firebaseMessaging || !config.public.firebaseVapidKey) return
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      const token = await getToken($firebaseMessaging, {
        vapidKey: config.public.firebaseVapidKey,
        serviceWorkerRegistration: sw
      })
      if (token) {
        fcmToken.value = token
        await $fetch('/api/notifications/fcm-token', { method: 'POST', body: { token } })
      }

      // Foreground handler — fires when the tab is active and FCM delivers
      onMessage($firebaseMessaging, (payload) => {
        const id = payload.data?.messageId ?? crypto.randomUUID()
        const msg: InboxMessage = {
          id,
          messageId: id,
          subject: payload.notification?.title ?? '',
          body: payload.notification?.body ?? '',
          read: false,
          createdAt: new Date().toISOString()
        }
        prependMessage(msg)
        // SSE already shows a toast for server-sent messages; FCM foreground is a duplicate path
        // only show toast if this message wasn't already added via SSE
      })
    } catch { /* FCM registration failure is non-fatal */ }
  }

  async function markAsRead(id: string) {
    await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    const msg = messages.value.find(m => m.id === id)
    if (msg) msg.read = true
  }

  async function markAllAsRead() {
    const unread = messages.value.filter(m => !m.read)
    await Promise.all(unread.map(m => $fetch(`/api/notifications/${m.id}/read`, { method: 'POST' })))
    messages.value = messages.value.map(m => ({ ...m, read: true }))
  }

  async function init() {
    if (!user.value || initialized.value) return
    initialized.value = true
    await loadInbox()
    connectSSE()
    await registerFCM()
  }

  async function disablePush() {
    if (!fcmToken.value) return
    await $fetch('/api/notifications/fcm-token', { method: 'DELETE', body: { token: fcmToken.value } })
    fcmToken.value = null
  }

  async function enablePush() {
    initialized.value = false
    await registerFCM()
    initialized.value = true
  }

  return { messages, unreadCount, fcmToken, init, markAsRead, markAllAsRead, loadInbox, enablePush, disablePush }
}
