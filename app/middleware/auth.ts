export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    if (!loggedIn.value || user.value?.role !== 'admin') {
      return navigateTo('/login')
    }
  }

  if (to.path === '/portal' || to.path.startsWith('/portal/')) {
    if (!loggedIn.value) {
      return navigateTo('/portal-login')
    }
  }
})
