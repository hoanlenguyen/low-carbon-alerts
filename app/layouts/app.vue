<script setup lang="ts">
const { user } = useUserSession()
const { logout } = useLogout()
const { messages, unreadCount, markAsRead, init } = useNotifications()

const showInbox = ref(false)

onMounted(init)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <header class="border-b border-default px-4 sm:px-6 h-16 flex items-center justify-between">
      <span class="font-semibold">Low Carbon Alerts</span>

      <div class="flex items-center gap-3">
        <span class="text-sm text-muted">{{ user?.name || user?.email }}</span>

        <UPopover v-model:open="showInbox">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-bell"
            aria-label="Notifications"
          >
            <template v-if="unreadCount > 0" #trailing>
              <UBadge
                :label="String(unreadCount)"
                color="error"
                size="xs"
                class="-mr-1"
              />
            </template>
          </UButton>

          <template #content>
            <div class="w-80 max-h-96 overflow-y-auto p-2 space-y-1">
              <p v-if="messages.length === 0" class="text-sm text-muted text-center py-4">
                No messages
              </p>
              <button
                v-for="msg in messages.slice(0, 10)"
                :key="msg.id"
                class="w-full text-left rounded-lg px-3 py-2 hover:bg-elevated transition-colors"
                :class="{ 'bg-elevated/60': !msg.read }"
                @click="markAsRead(msg.id)"
              >
                <p class="text-sm font-medium" :class="{ 'text-highlighted': !msg.read }">
                  {{ msg.subject }}
                </p>
                <p class="text-xs text-muted line-clamp-2 mt-0.5">
                  {{ msg.body }}
                </p>
                <p class="text-xs text-muted mt-1">
                  {{ new Date(msg.createdAt).toLocaleString() }}
                </p>
              </button>
            </div>
          </template>
        </UPopover>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          aria-label="Log out"
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
