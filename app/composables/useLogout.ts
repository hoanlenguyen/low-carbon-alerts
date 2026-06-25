export function useLogout() {
  const { clear, user } = useUserSession()

  async function logout() {
    const role = user.value?.role
    await clear()
    await navigateTo('/login')
  }

  return { logout }
}
