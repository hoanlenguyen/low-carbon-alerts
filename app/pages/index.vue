<script setup lang="ts">
const { loggedIn, user } = useUserSession()

if (loggedIn.value) {
  await navigateTo(user.value?.role === 'admin' ? '/admin' : '/portal')
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div />
</template>
