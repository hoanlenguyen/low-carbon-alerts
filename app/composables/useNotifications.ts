import { getToken } from 'firebase/messaging'

interface InboxMessage {
  id: string
  messageId: string
  subject: string
  body: string
  read: boolean
  createdAt: string
}

// Shared state across all composable calls via useState
const useMessages = () => useState<InboxMessage[]>('notifications-messages', () => [])
const usePollingStarted = () => useState('notifications-polling', () => false)

export function useNotifications() {
  const nuxtApp = useNuxtApp()
  const { user } = useUserSession()
  const config = useRuntimeConfig()

  const messages = useMessages()
  const pollingStarted = usePollingStarted()
  const unreadCount = computed(() => messages.value.filter(m => !m.read).length)
  const fcmToken = ref<string | null>(null)

  async function loadInbox() {
    if (!user.value) return
    const data = await $fetch<InboxMessage[]>('/api/notifications/inbox')
    messages.value = data
  }

  function startPolling() {
    if (!import.meta.client || pollingStarted.value) return
    pollingStarted.value = true

    const interval = setInterval(async () => {
      if (!user.value) {
        clearInterval(interval)
        pollingStarted.value = false
        return
      }
      try {
        const data = await $fetch<InboxMessage[]>('/api/notifications/inbox')
        // Merge new messages without losing read state already in memory
        const existing = new Map(messages.value.map(m => [m.id, m]))
        for (const msg of data) {
          if (!existing.has(msg.id)) existing.set(msg.id, msg)
        }
        messages.value = Array.from(existing.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      } catch { /* non-fatal */ }
    }, 10000)

    onUnmounted(() => {
      clearInterval(interval)
      pollingStarted.value = false
    })
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
    startPolling()
    await registerFCM()
  }

  return { messages, unreadCount, fcmToken, init, markAsRead, loadInbox }
}
