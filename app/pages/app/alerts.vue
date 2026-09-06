<!-- eslint-disable vue/html-closing-bracket-newline -->
<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { messages, unreadCount, markAsRead, markAllAsRead } = useNotifications()

const TZ = 'Europe/Helsinki'
const filter = ref<'all' | 'unread' | 'read'>('all')
const pageSize = 10
const page = ref(1)

watch(filter, () => { page.value = 1 })
watch(() => messages.value.length, () => { page.value = 1 })

const filtered = computed(() => {
  if (filter.value === 'unread') return messages.value.filter(m => !m.read)
  if (filter.value === 'read') return messages.value.filter(m => m.read)
  return messages.value
})

const paged = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize)
)

const filterTabs = computed(() => [
  { key: 'all', label: 'All', count: messages.value.length },
  { key: 'unread', label: 'Unread', count: messages.value.filter(m => !m.read).length },
  { key: 'read', label: 'Read', count: messages.value.filter(m => m.read).length }
])

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
    <!-- Page header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-highlighted">
          Alerts
        </h1>
        <p class="text-sm text-muted mt-0.5">
          Your low-carbon notification history.
        </p>
      </div>
      <UButton
        v-if="unreadCount > 0"
        size="sm"
        color="neutral"
        variant="outline"
        @click="markAllAsRead"
      >
        Mark all read
      </UButton>
    </div>

    <!-- Filter tabs + list -->
    <UPageCard variant="subtle" :ui="{ body: 'p-0!' }">
      <!-- Filter bar -->
      <div class="flex gap-0 border-b border-default overflow-x-auto px-1">
        <button
          v-for="tab in filterTabs"
          :key="tab.key"
          class="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="filter === tab.key
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:text-highlighted'"
          @click="filter = tab.key as typeof filter"
        >
          {{ tab.label }}
          <span
            class="text-xs tabular-nums px-1.5 py-0.5 rounded-full"
            :class="filter === tab.key ? 'bg-primary/10 text-primary' : 'bg-elevated text-dimmed'"
          >{{ tab.count }}</span>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="filtered.length === 0" class="py-16 text-center">
        <UIcon name="i-lucide-bell-off" class="size-8 text-dimmed mx-auto mb-3" />
        <p class="text-sm text-muted">
          {{ filter === 'unread' ? 'All caught up!' : 'No alerts yet.' }}
        </p>
      </div>

      <!-- Alert list (min-w-0 so the grid column can shrink and inner horizontal
           scrollers — e.g. the shift picker's hourly carbon strip — clip instead of
           stretching the card) -->
      <ul v-else class="min-w-0 divide-y divide-default">
        <li
          v-for="msg in paged"
          :key="msg.id"
          class="flex items-start gap-3 px-4 py-4 cursor-pointer transition-colors"
          :class="msg.read ? 'hover:bg-elevated/30' : 'bg-primary/5 hover:bg-primary/10'"
          @click="markAsRead(msg.id)"
        >
          <span
            class="mt-1.5 shrink-0 size-2 rounded-full transition-colors"
            :class="msg.read ? 'bg-transparent ring-1 ring-default' : 'bg-primary'"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p
                class="text-sm"
                :class="msg.read ? 'text-muted font-normal' : 'text-highlighted font-semibold'"
              >
                {{ msg.subject }}
              </p>
              <span class="text-xs text-dimmed tabular-nums shrink-0">{{ timeLabel(msg.createdAt) }}</span>
            </div>
            <p class="text-sm text-muted mt-1 leading-relaxed">
              {{ msg.body }}
            </p>

            <!-- "I shifted it" action (smart-alert messages with context) -->
            <ShiftActionRow :message-id="msg.id" />
          </div>
        </li>
      </ul>

      <!-- Pagination -->
      <div
        v-if="filtered.length > pageSize"
        class="flex items-center justify-between px-4 py-3 border-t border-default"
      >
        <p class="text-xs text-muted tabular-nums">
          {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} of {{ filtered.length }}
        </p>
        <UPagination
          v-model:page="page"
          :total="filtered.length"
          :items-per-page="pageSize"
          size="xs" />
      </div>
    </UPageCard>
  </div>
</template>
