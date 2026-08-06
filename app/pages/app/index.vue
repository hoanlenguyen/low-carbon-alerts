<!-- eslint-disable vue/html-closing-bracket-newline -->
<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { user } = useUserSession()
const { messages, unreadCount, markAsRead } = useNotifications()

const TZ = 'Europe/Helsinki'

const recentMessages = computed(() => messages.value.slice(0, 3))

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: TZ
})
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: TZ
})

function timeLabel(val: string) {
  const d = new Date(val)
  return `${timeFmt.format(d)} · ${dateFmt.format(d)}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome -->
    <div>
      <h1 class="text-xl font-semibold text-highlighted">
        Welcome back, {{ user?.name?.split(' ')[0] || user?.email }}
      </h1>
      <p class="text-sm text-muted mt-0.5">
        Here's Finland's grid right now.
      </p>
    </div>

    <!-- Carbon intensity card -->
    <CarbonIntensityCard />

    <!-- Recent alerts -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bell" class="size-4 text-primary shrink-0" />
            <span class="font-semibold text-sm text-highlighted">Recent Alerts</span>
            <UBadge
              v-if="unreadCount > 0"
              :label="String(unreadCount)"
              color="error"
              size="xs" />
          </div>
          <UButton
            to="/app/alerts"
            size="xs"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-arrow-right">
            View all
          </UButton>
        </div>
      </template>

      <div v-if="messages.length === 0" class="text-sm text-muted py-8 text-center border border-dashed border-default rounded-lg">
        No alerts yet. You'll be notified when low-carbon windows are detected.
      </div>

      <ul v-else class="divide-y divide-default -mx-1">
        <li
          v-for="msg in recentMessages"
          :key="msg.id"
          class="flex items-start gap-3 px-3 py-3.5 rounded-lg cursor-pointer transition-colors"
          :class="msg.read ? 'hover:bg-elevated/30' : 'bg-primary/5 hover:bg-primary/10'"
          @click="markAsRead(msg.id)"
        >
          <span
            class="mt-1.5 shrink-0 size-2 rounded-full transition-colors"
            :class="msg.read ? 'bg-transparent' : 'bg-primary'"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p
                class="text-sm truncate"
                :class="msg.read ? 'text-muted font-normal' : 'text-highlighted font-semibold'"
              >
                {{ msg.subject }}
              </p>
              <span class="text-xs text-dimmed tabular-nums shrink-0">{{ timeLabel(msg.createdAt) }}</span>
            </div>
            <p class="text-sm text-muted mt-0.5 leading-relaxed line-clamp-2">
              {{ msg.body }}
            </p>
          </div>
        </li>
      </ul>

      <template v-if="messages.length > 3" #footer>
        <UButton
          to="/app/alerts"
          variant="ghost"
          color="neutral"
          size="sm"
          block
          trailing-icon="i-lucide-arrow-right">
          View all {{ messages.length }} alerts
        </UButton>
      </template>
    </UPageCard>
  </div>
</template>
