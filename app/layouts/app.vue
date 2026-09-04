<script setup lang="ts">
const route = useRoute()
const { user } = useUserSession()
const { logout } = useLogout()
const { messages, unreadCount, markAsRead, markAllAsRead, init } = useNotifications()
const { earned } = useAchievements()
const showInbox = ref(false)

onMounted(init)

// Reflect the unread count in the browser tab title, so a new message is
// noticeable even when the app is in a background tab (e.g. "(2) Low Carbon Alerts").
useHead({
  title: computed(() => (unreadCount.value > 0 ? `(${unreadCount.value}) ` : '') + 'Low Carbon Alerts')
})

const navItems = [
  { label: 'Home', icon: 'i-lucide-zap', to: '/app' },
  { label: 'Alerts', icon: 'i-lucide-bell', to: '/app/alerts' },
  { label: 'Schedule', icon: 'i-lucide-calendar-clock', to: '/app/schedule' },
  { label: 'Forecast', icon: 'i-lucide-trending-up', to: '/app/forecast' },
  { label: 'Energy Profile', icon: 'i-lucide-house-plug', to: '/app/energy-consumption' },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/app/settings' }
]

function isActive(to: string) {
  if (to === '/app') return route.path === '/app'
  return route.path.startsWith(to)
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-default">
    <!-- Header -->
    <header class="border-b border-default px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
      <NuxtLink to="/app" class="flex items-center gap-2 font-semibold text-highlighted hover:text-primary transition-colors">
        <img
          src="/android-chrome-192x192.png"
          alt="Low Carbon Alerts"
          width="28"
          height="28"
          class="size-7 rounded-md">
        <span>Low Carbon Alerts</span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <span class="hidden sm:block text-sm text-muted">{{ user?.name || user?.userName }}</span>

        <!-- Earned achievement badges (each in its own color, hover for the name) -->
        <div v-if="earned.length" class="hidden sm:flex items-center gap-1">
          <UTooltip v-for="b in earned.slice(0, 6)" :key="b.id" :text="b.label">
            <div class="size-6 rounded-full ring-1 flex items-center justify-center" :class="BADGE_COLORS[b.color].chip">
              <UIcon :name="b.icon" class="size-3.5" :class="BADGE_COLORS[b.color].icon" />
            </div>
          </UTooltip>
          <span v-if="earned.length > 6" class="text-xs text-dimmed tabular-nums">+{{ earned.length - 6 }}</span>
        </div>

        <!-- Bell popover -->
        <UPopover v-model:open="showInbox">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-bell"
            aria-label="Notifications"
            size="sm">
            <template v-if="unreadCount > 0" #trailing>
              <UBadge
                :label="String(unreadCount)"
                color="error"
                size="xs"
                class="-mr-1" />
            </template>
          </UButton>

          <template #content>
            <div class="w-80">
              <div class="flex items-center justify-between px-3 pt-3 pb-2 border-b border-default">
                <span class="text-xs font-semibold uppercase tracking-wide text-dimmed">Notifications</span>
                <UButton
                  v-if="unreadCount > 0"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="markAllAsRead">
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
                <NuxtLink to="/app/alerts" class="text-xs text-primary hover:underline" @click="showInbox = false">
                  View all alerts →
                </NuxtLink>
              </div>
            </div>
          </template>
        </UPopover>

        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          size="sm"
          aria-label="Log out"
          @click="logout" />
      </div>
    </header>

    <!-- Desktop pill nav -->
    <nav class="hidden sm:flex items-center gap-1 px-4 sm:px-6 py-2 border-b border-default overflow-x-auto shrink-0">
      <button
        v-for="item in navItems"
        :key="item.to"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap"
        :class="isActive(item.to)
          ? 'bg-primary text-white'
          : 'text-muted hover:text-highlighted hover:bg-elevated'"
        @click="navigateTo(item.to)"
      >
        <UIcon :name="item.icon" class="size-3.5 shrink-0" />
        {{ item.label }}
        <UBadge
          v-if="item.label === 'Alerts' && unreadCount > 0"
          :label="String(unreadCount)"
          color="error"
          size="xs"
          class="-my-0.5"
        />
      </button>
    </nav>

    <!-- Main content -->
    <main class="flex-1 px-4 sm:px-6 py-6 max-w-3xl w-full mx-auto pb-24 sm:pb-8">
      <slot />
    </main>

    <!-- Mobile bottom bar -->
    <nav class="sm:hidden fixed bottom-0 left-0 right-0 bg-default/95 backdrop-blur border-t border-default flex z-50 pb-safe">
      <button
        v-for="item in navItems"
        :key="item.to"
        class="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors relative"
        :class="isActive(item.to) ? 'text-primary' : 'text-muted'"
        @click="navigateTo(item.to)"
      >
        <UIcon :name="item.icon" class="size-5" />
        {{ item.label }}
        <span
          v-if="item.label === 'Alerts' && unreadCount > 0"
          class="absolute top-2 right-1/4 size-1.5 rounded-full bg-error"
        />
      </button>
    </nav>
  </div>
</template>
