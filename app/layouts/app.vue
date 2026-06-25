<script setup lang="ts">
const { user } = useUserSession()
const { logout } = useLogout()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <header class="border-b border-default px-4 sm:px-6 h-16 flex items-center justify-between">
      <span class="font-semibold">Low Carbon Alerts</span>

      <div class="flex items-center gap-3">
        <span class="text-sm text-muted">{{ user?.name || user?.email }}</span>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          @click="logout"
        >
          Log out
        </UButton>
      </div>
    </header>

    <main class="flex-1 px-4 sm:px-6 py-8 max-w-3xl w-full mx-auto">
      <slot />
    </main>
  </div>
</template>
