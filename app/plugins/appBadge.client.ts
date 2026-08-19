// Mirror the unread-notification count onto the installed PWA's app icon via the
// Badging API. Works on iOS 16.4+ Home Screen apps and desktop Chrome/Edge
// installed apps; a no-op where unsupported (e.g. Android, browser tabs).
export default defineNuxtPlugin(() => {
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (!nav.setAppBadge) return

  // Same shared state key useNotifications writes to.
  const messages = useState<{ read: boolean }[]>('notifications-messages', () => [])
  const unread = computed(() => messages.value.filter(m => !m.read).length)

  watch(unread, (n) => {
    if (n > 0) nav.setAppBadge?.(n).catch(() => {})
    else nav.clearAppBadge?.().catch(() => {})
  }, { immediate: true })
})
