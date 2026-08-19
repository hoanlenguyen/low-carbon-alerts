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

// Persisted opt-out so a page reload doesn't silently re-enable push after the
// user turned it off. Bound once so we don't stack foreground handlers.
const PUSH_PREF_KEY = 'lca-push-enabled'
let foregroundBound = false
let visibilityBound = false
let sseConnection: EventSource | null = null

export function useNotifications() {
  const nuxtApp = useNuxtApp()
  const { user } = useUserSession()
  const config = useRuntimeConfig()
  const toast = useToast()

  const messages = useMessages()
  const initialized = useInitialized()
  const fcmToken = useFcmToken()
  const unreadCount = computed(() => messages.value.filter(m => !m.read).length)

  // Identity is messageId (messages.id) — the value the inbox, SSE, and FCM all
  // carry — so a pushed message and its later inbox row don't double-count.
  function prependMessage(msg: InboxMessage) {
    if (!messages.value.find(m => m.messageId === msg.messageId)) {
      messages.value = [msg, ...messages.value]
    }
  }

  async function loadInbox() {
    if (!user.value) return
    const data = await $fetch<InboxMessage[]>('/api/notifications/inbox')
    // Use messageId as the client-side id so it matches pushed messages.
    messages.value = data.map(m => ({ ...m, id: m.messageId }))
  }

  function connectSSE() {
    if (!import.meta.client || !user.value) return
    if (sseConnection) {
      try { sseConnection.close() } catch { /* already closed */ }
    }
    const es = new EventSource('/api/notifications/stream')
    sseConnection = es
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

  function messaging() {
    return nuxtApp.$firebaseMessaging as ReturnType<typeof import('firebase/messaging').getMessaging> | undefined
  }

  // Register the SW, fetch the FCM token, save it, and bind the foreground handler
  // once. Assumes permission is already granted — no prompting happens here.
  async function saveToken() {
    const $fm = messaging()
    if (!$fm || !config.public.firebaseVapidKey) return

    const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken($fm, {
      vapidKey: config.public.firebaseVapidKey,
      serviceWorkerRegistration: sw
    })
    if (token) {
      fcmToken.value = token
      await $fetch('/api/notifications/fcm-token', { method: 'POST', body: { token } })
    }

    if (!foregroundBound) {
      foregroundBound = true
      onMessage($fm, (payload) => {
        const id = payload.data?.messageId ?? crypto.randomUUID()
        prependMessage({
          id,
          messageId: id,
          subject: payload.notification?.title ?? '',
          body: payload.notification?.body ?? '',
          read: false,
          createdAt: new Date().toISOString()
        })
      })
    }
  }

  // Called on every app load. Only re-registers the token if push is already
  // granted AND the user hasn't opted out — never prompts.
  async function syncPush() {
    if (!import.meta.client) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (localStorage.getItem(PUSH_PREF_KEY) === 'off') return
    try {
      await saveToken()
    } catch { /* non-fatal */ }
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
    await syncPush()

    // Reopening the app (e.g. after a background push froze the tab) can leave
    // the in-memory list stale; refresh on resume so the count + badge correct.
    if (import.meta.client && !visibilityBound) {
      visibilityBound = true
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && user.value) loadInbox().catch(() => {})
      })
    }
  }

  // Tear down per-user state on logout so the next account (same tab) re-inits
  // cleanly — otherwise `initialized` stays true and their inbox/SSE never load.
  function reset() {
    if (sseConnection) {
      try { sseConnection.close() } catch { /* already closed */ }
      sseConnection = null
    }
    messages.value = []
    fcmToken.value = null
    initialized.value = false
  }

  async function disablePush() {
    // Remember the choice so init() won't re-register on the next load.
    if (import.meta.client) localStorage.setItem(PUSH_PREF_KEY, 'off')
    if (!fcmToken.value) return
    await $fetch('/api/notifications/fcm-token', { method: 'DELETE', body: { token: fcmToken.value } })
    fcmToken.value = null
  }

  // Explicit user action — this is the only place we prompt for permission.
  async function enablePush() {
    if (!import.meta.client) return
    if (!messaging() || !config.public.firebaseVapidKey) {
      toast.add({ title: 'Push notifications aren’t available', description: 'Messaging is not configured.', color: 'warning' })
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    localStorage.setItem(PUSH_PREF_KEY, 'on')
    try {
      await saveToken()
    } catch { /* non-fatal */ }
  }

  return { messages, unreadCount, fcmToken, init, reset, markAsRead, markAllAsRead, loadInbox, enablePush, disablePush }
}
