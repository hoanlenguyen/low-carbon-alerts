<!-- eslint-disable @stylistic/max-statements-per-line -->
<!-- eslint-disable vue/html-closing-bracket-newline -->
<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { user } = useUserSession()
const { messages, unreadCount, markAsRead, markAllAsRead } = useNotifications()

const pageSize = 5
const page = ref(1)

const pagedMessages = computed(() =>
  messages.value.slice((page.value - 1) * pageSize, page.value * pageSize)
)

watch(() => messages.value.length, () => { page.value = 1 })

const TZ = 'Europe/Helsinki'

function timeLabel(val: string) {
  const diff = Date.now() - new Date(val).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: TZ })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-highlighted">
          Welcome back, {{ user?.name || user?.email }}
        </h1>
        <p class="text-sm text-muted mt-0.5">
          Your low-carbon alert inbox.
        </p>
      </div>
    </div>

    <!-- Carbon intensity card -->
    <CarbonIntensityCard />

    <!-- Messages card -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bell" class="size-4 text-primary shrink-0" />
            <span class="font-semibold text-sm text-highlighted">Messages</span>
            <UBadge
              v-if="unreadCount > 0"
              :label="String(unreadCount)"
              color="error"
              size="xs"
            />
          </div>
          <UButton
            v-if="unreadCount > 0"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="markAllAsRead"
          >
            Mark all read
          </UButton>
        </div>
      </template>

      <div v-if="messages.length === 0" class="text-sm text-muted py-8 text-center border border-dashed border-default rounded-lg">
        No messages yet. You'll be notified when low-carbon windows are detected.
      </div>

      <template v-else>
        <ul class="divide-y divide-default -mx-1">
          <li
            v-for="msg in pagedMessages"
            :key="msg.id"
            class="flex items-start gap-3 px-3 py-3.5 rounded-lg cursor-pointer transition-colors"
            :class="msg.read ? 'hover:bg-elevated/30' : 'bg-primary/5 hover:bg-primary/10'"
            @click="markAsRead(msg.id)"
          >
            <span class="mt-1.5 shrink-0 size-2 rounded-full transition-colors" :class="msg.read ? 'bg-transparent' : 'bg-primary'" />

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
              <p class="text-sm text-muted mt-0.5 leading-relaxed">
                {{ msg.body }}
              </p>
            </div>
          </li>
        </ul>

        <div v-if="messages.length > pageSize" class="flex items-center justify-between pt-4 border-t border-default mt-2">
          <p class="text-xs text-muted tabular-nums">
            {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, messages.length) }} of {{ messages.length }}
          </p>
          <UPagination v-model:page="page" :total="messages.length" :items-per-page="pageSize" size="xs" />
        </div>
      </template>
    </UPageCard>

  </div>
</template>
