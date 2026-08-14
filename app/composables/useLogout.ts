export function useLogout() {
  const { clear, user } = useUserSession()
  const { fcmToken, reset } = useNotifications()

  async function logout() {
    const role = user.value?.role

    if (fcmToken.value) {
      await $fetch('/api/notifications/fcm-token', {
        method: 'DELETE',
        body: { token: fcmToken.value }
      }).catch(() => {})
    }
    // Reset in-memory notification state + close SSE so the next account signing
    // in on this tab re-initialises cleanly.
    reset()
    await clear()
    await navigateTo(role === 'admin' ? '/admin-login' : '/login')
  }

  return { logout }
}
