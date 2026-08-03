<script setup lang="ts">
import type { CarbonData } from '~/server/api/carbon.get'

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

function timeLabel(val: string) {
  const diff = Date.now() - new Date(val).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

// Carbon data
const { data: carbon, error: carbonError } = await useFetch<CarbonData>('/api/carbon')

const statusConfig = {
  excellent: { color: 'success' as const, icon: 'i-lucide-leaf', bg: 'bg-success/10', text: 'text-success' },
  good:      { color: 'primary' as const, icon: 'i-lucide-zap', bg: 'bg-primary/10', text: 'text-primary' },
  moderate:  { color: 'warning' as const, icon: 'i-lucide-cloud', bg: 'bg-warning/10', text: 'text-warning' },
  high:      { color: 'error' as const, icon: 'i-lucide-flame', bg: 'bg-error/10', text: 'text-error' },
}

const statusCfg = computed(() =>
  carbon.value ? statusConfig[carbon.value.current.status] : statusConfig.moderate
)

function nextWindowLabel(win: CarbonData['nextLowWindow']): string {
  if (!win) return ''
  const t = new Date(win.time)
  const timeStr = t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (win.hoursFromNow <= 0) return 'Starting now'
  if (win.hoursFromNow === 1) return `In ~1 hour (${timeStr})`
  return `In ~${win.hoursFromNow}h · ${timeStr}`
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
    <UPageCard variant="subtle" :ui="{ root: 'overflow-hidden' }">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Grid Carbon Intensity · Finland</span>
        </div>
      </template>

      <div v-if="carbonError" class="text-sm text-muted py-6 text-center">
        <UIcon name="i-lucide-wifi-off" class="size-5 mx-auto mb-2 text-dimmed" />
        Could not load carbon data
      </div>

      <template v-else-if="carbon">
        <!-- Status row -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-5">
          <!-- Big number -->
          <div
            class="flex items-center gap-3 shrink-0 rounded-xl px-4 py-3"
            :class="statusCfg.bg"
          >
            <UIcon :name="statusCfg.icon" class="size-7" :class="statusCfg.text" />
            <div>
              <p class="text-3xl font-bold tabular-nums" :class="statusCfg.text">
                {{ carbon.current.value }}
              </p>
              <p class="text-xs text-muted mt-0.5">
                {{ carbon.unit }}
              </p>
            </div>
          </div>

          <!-- Label + badges -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-highlighted leading-snug">
              {{ carbon.current.label }}
            </p>

            <div class="flex flex-wrap items-center gap-2 mt-2">
              <UBadge :color="statusCfg.color" variant="subtle" size="sm" class="capitalize">
                {{ carbon.current.status }}
              </UBadge>

              <template v-if="carbon.current.status === 'excellent'">
                <UBadge color="success" variant="outline" size="sm" icon="i-lucide-check">
                  Good time to run appliances
                </UBadge>
              </template>

              <template v-else-if="carbon.nextLowWindow">
                <UBadge color="neutral" variant="subtle" size="sm" icon="i-lucide-clock">
                  Next low window: {{ nextWindowLabel(carbon.nextLowWindow) }}
                </UBadge>
              </template>
            </div>
          </div>
        </div>

        <!-- 48h chart -->
        <div class="mt-1">
          <p class="text-xs text-dimmed mb-2 flex items-center gap-2">
            <span>Past 24h + 24h forecast</span>
            <span class="inline-flex items-center gap-1">
              <span class="inline-block w-4 border-t-2 border-primary/60 border-dashed" />
              <span>forecast</span>
            </span>
          </p>
          <ClientOnly>
            <AppCarbonChart
              :points="carbon.points"
              :forecast-start-ms="carbon.forecastStartMs"
            />
            <template #fallback>
              <div class="h-48 bg-elevated/40 rounded-lg animate-pulse" />
            </template>
          </ClientOnly>
        </div>

        <p class="text-xs text-dimmed mt-3">
          Source: Fingrid / Sähköjälki · Updated {{ timeLabel(carbon.generatedAt) }}
        </p>
      </template>

      <!-- Skeleton -->
      <template v-else>
        <div class="space-y-3">
          <div class="h-16 rounded-xl bg-elevated/50 animate-pulse" />
          <div class="h-48 rounded-lg bg-elevated/40 animate-pulse" />
        </div>
      </template>
    </UPageCard>

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
