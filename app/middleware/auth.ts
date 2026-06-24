export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    if (!loggedIn.value || user.value?.role !== 'admin') {
      return navigateTo('/admin-login')
    }
  }

  if (to.path === '/app' || to.path.startsWith('/app/')) {
    if (!loggedIn.value) {
      return navigateTo('/login')
    }
  }
})
