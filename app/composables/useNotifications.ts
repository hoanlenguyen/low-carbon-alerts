import { getToken } from 'firebase/messaging'

interface InboxMessage {
  id: string
  messageId: string
  subject: string
  body: string
  read: boolean
  createdAt: string
}

export function useNotifications() {
  const nuxtApp = useNuxtApp()
  const { user } = useUserSession()
  const config = useRuntimeConfig()

  const messages = ref<InboxMessage[]>([])
  const unreadCount = computed(() => messages.value.filter(m => !m.read).length)
  const fcmToken = ref<string | null>(null)

  async function loadInbox() {
    const data = await $fetch<InboxMessage[]>('/api/notifications/inbox')
    messages.value = data
  }

  function connectSSE() {
    const es = new EventSource('/api/notifications/stream')
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as InboxMessage
        messages.value.unshift(msg)
      } catch { /* ignore malformed SSE data */ }
    }
    es.onerror = () => {
      es.close()
      setTimeout(connectSSE, 5000)
    }
    return es
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
    } catch { /* FCM registration failure is non-fatal */ }
  }

  async function markAsRead(id: string) {
    await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    const msg = messages.value.find(m => m.id === id)
    if (msg) msg.read = true
  }

  async function init() {
    if (!user.value) return
    await loadInbox()
    const es = connectSSE()
    await registerFCM()
    onUnmounted(() => es.close())
  }

  return { messages, unreadCount, fcmToken, init, markAsRead, loadInbox }
}
