export function useLogout() {
  const { clear, user } = useUserSession()
  const { fcmToken } = useNotifications()

  async function logout() {
    const role = user.value?.role

    if (fcmToken.value) {
      await $fetch('/api/notifications/fcm-token', {
        method: 'DELETE',
        body: { token: fcmToken.value }
      }).catch(() => {})
    }
    await clear()
    await navigateTo(role === 'admin' ? '/admin-login' : '/login')
  }

  return { logout }
}
