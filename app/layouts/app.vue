<script setup lang="ts">
const { user } = useUserSession()
const { logout } = useLogout()
const { messages, unreadCount, markAsRead, markAllAsRead, init } = useNotifications()

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
            <div class="w-80">
              <div class="flex items-center justify-between px-3 pt-3 pb-2 border-b border-default">
                <span class="text-xs font-semibold uppercase tracking-wide text-dimmed">Notifications</span>
                <UButton v-if="unreadCount > 0" size="xs" color="neutral" variant="ghost" @click="markAllAsRead">
                  Mark all read
                </UButton>
              </div>
              <div class="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
                <p v-if="messages.length === 0" class="text-sm text-muted text-center py-6">
                  No messages yet
                </p>
                <button
                  v-for="msg in messages.slice(0, 10)"
                  :key="msg.id"
                  class="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
                  :class="msg.read ? 'hover:bg-elevated/60' : 'bg-primary/5 hover:bg-primary/10'"
                  @click="markAsRead(msg.id); showInbox = false"
                >
                  <div class="flex items-baseline justify-between gap-2">
                    <p class="text-sm truncate" :class="msg.read ? 'text-muted' : 'font-semibold text-highlighted'">
                      {{ msg.subject }}
                    </p>
                    <span v-if="!msg.read" class="size-1.5 rounded-full bg-primary shrink-0 mt-1" />
                  </div>
                  <p class="text-xs text-muted line-clamp-2 mt-0.5 leading-relaxed">
                    {{ msg.body }}
                  </p>
                </button>
              </div>
              <div class="border-t border-default px-3 py-2">
                <NuxtLink to="/app" class="text-xs text-primary hover:underline" @click="showInbox = false">
                  View all messages →
                </NuxtLink>
              </div>
            </div>
          </template>
        </UPopover>

        <UButton
          to="/app/settings"
          color="neutral"
          variant="ghost"
          icon="i-lucide-settings"
          aria-label="Settings"
        />

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
