<script setup lang="ts">
const { loggedIn, user } = useUserSession()

if (loggedIn.value) {
  await navigateTo(user.value?.role === 'admin' ? '/admin' : '/app')
} else {
  await navigateTo('/admin-login')
}
</script>

<template>
  <div />
</template>
