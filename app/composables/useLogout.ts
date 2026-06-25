export function useLogout() {
  const { clear } = useUserSession()
  const { fcmToken } = useNotifications()

  async function logout() {
    if (fcmToken.value) {
      await $fetch('/api/notifications/fcm-token', {
        method: 'DELETE',
        body: { token: fcmToken.value }
      }).catch(() => {})
    }
    await clear()
    await navigateTo('/login')
  }

  return { logout }
}
