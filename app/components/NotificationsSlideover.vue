<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'

const { isNotificationsSlideoverOpen } = useDashboard()

type ActivityEvent = {
  id: string
  type: 'message_sent' | 'user_joined' | 'job_fired'
  title: string
  body: string
  date: string
  unread: boolean
}

const { data: events, refresh } = await useFetch<ActivityEvent[]>('/api/notifications')

watch(isNotificationsSlideoverOpen, (open) => {
  if (open) refresh()
})

const iconMap = {
  message_sent: 'i-lucide-send',
  user_joined: 'i-lucide-user-plus',
  job_fired: 'i-lucide-clock'
} as const

const colorMap = {
  message_sent: 'text-primary',
  user_joined: 'text-success',
  job_fired: 'text-muted'
} as const

const bgMap = {
  message_sent: 'bg-primary/10',
  user_joined: 'bg-success/10',
  job_fired: 'bg-elevated'
} as const

const unreadCount = computed(() => events.value?.filter(e => e.unread).length ?? 0)
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    :ui="{ header: 'border-b border-default' }"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <span>Activity</span>
        <UBadge
          v-if="unreadCount > 0"
          :label="String(unreadCount)"
          color="error"
          size="xs" />
      </div>
    </template>

    <template #body>
      <div v-if="!events?.length" class="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <UIcon name="i-lucide-inbox" class="size-8 text-dimmed" />
        <p class="text-sm text-muted">
          No activity yet
        </p>
      </div>

      <ul v-else class="divide-y divide-default -mx-4 sm:-mx-6">
        <li
          v-for="ev in events"
          :key="ev.id"
          class="flex items-start gap-3 px-4 sm:px-6 py-3.5 transition-colors"
          :class="ev.unread ? 'bg-primary/5' : 'hover:bg-elevated/40'"
        >
          <div
            class="mt-0.5 size-8 rounded-full flex items-center justify-center shrink-0"
            :class="bgMap[ev.type]"
          >
            <UIcon :name="iconMap[ev.type]" class="size-4" :class="colorMap[ev.type]" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p
                class="text-sm truncate"
                :class="ev.unread ? 'font-semibold text-highlighted' : 'font-medium'"
              >
                {{ ev.title }}
              </p>
              <span class="text-xs text-dimmed tabular-nums shrink-0">
                {{ formatTimeAgo(new Date(ev.date)) }}
              </span>
            </div>
            <p class="text-xs text-muted mt-0.5">
              {{ ev.body }}
            </p>
          </div>

          <span v-if="ev.unread" class="mt-2 size-1.5 rounded-full bg-primary shrink-0" />
        </li>
      </ul>
    </template>
  </USlideover>
</template>
