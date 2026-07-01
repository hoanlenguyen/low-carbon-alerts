import { getToken, onMessage } from 'firebase/messaging'

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

export function useNotifications() {
  const nuxtApp = useNuxtApp()
  const { user } = useUserSession()
  const config = useRuntimeConfig()

  const messages = useMessages()
  const unreadCount = computed(() => messages.value.filter(m => !m.read).length)
  const fcmToken = ref<string | null>(null)

  async function loadInbox() {
    if (!user.value) return
    const data = await $fetch<InboxMessage[]>('/api/notifications/inbox')
    messages.value = data
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

      // Foreground message handler — fires when tab is open
      onMessage($firebaseMessaging, (payload) => {
        const msg: InboxMessage = {
          id: payload.data?.messageId ?? crypto.randomUUID(),
          messageId: payload.data?.messageId ?? '',
          subject: payload.notification?.title ?? '',
          body: payload.notification?.body ?? '',
          read: false,
          createdAt: new Date().toISOString()
        }
        // Prepend if not already in list
        if (!messages.value.find(m => m.id === msg.id)) {
          messages.value = [msg, ...messages.value]
        }
      })
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
    await registerFCM()
  }

  return { messages, unreadCount, fcmToken, init, markAsRead, loadInbox }
}
