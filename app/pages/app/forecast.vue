<!-- eslint-disable vue/html-closing-bracket-newline -->
<script setup lang="ts">
import type { CarbonData, CarbonStatus } from '~/server/api/carbon.get'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const TZ = 'Europe/Helsinki'

const { data: carbon } = useFetch<CarbonData>('/api/carbon')

const statusConfig: Record<CarbonStatus, { bg: string; text: string; bar: string }> = {
  excellent: { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success' },
  good:      { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  moderate:  { bg: 'bg-warning/10', text: 'text-warning', bar: 'bg-warning' },
  high:      { bg: 'bg-error/10',   text: 'text-error',   bar: 'bg-error' },
}

function getStatus(v: number): CarbonStatus {
  if (v < 20) return 'excellent'
  if (v < 30) return 'good'
  if (v < 50) return 'moderate'
  return 'high'
}

const nextHours = computed(() => {
  if (!carbon.value) return []
  const now = Date.now()
  return carbon.value.points
    .filter(p => p.isForecast && p.time >= now)
    .slice(0, 8)
})

function barHeight(value: number) {
  return Math.max(4, Math.min(100, Math.round(value / 70 * 100))) + '%'
}

function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

const thresholds = [
  {
    status: 'excellent' as CarbonStatus,
    emoji: '🍃',
    label: 'Excellent',
    range: '< 20 gCO₂/kWh',
    tip: 'Run dishwasher, EV charging, laundry, water heater — now is the time.',
  },
  {
    status: 'good' as CarbonStatus,
    emoji: '💧',
    label: 'Good',
    range: '20–30 gCO₂/kWh',
    tip: 'Better than average. Go ahead with energy-intensive tasks.',
  },
  {
    status: 'moderate' as CarbonStatus,
    emoji: '☁️',
    label: 'Moderate',
    range: '30–50 gCO₂/kWh',
    tip: 'Typical Finnish grid mix. No urgent reason to delay or rush.',
  },
  {
    status: 'high' as CarbonStatus,
    emoji: '🔥',
    label: 'High',
    range: '> 50 gCO₂/kWh',
    tip: 'Delay heavy loads if you can — a better window is likely coming.',
  },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-xl font-semibold text-highlighted">Forecast</h1>
      <p class="text-sm text-muted mt-0.5">48-hour Finnish grid carbon intensity.</p>
    </div>

    <!-- Full carbon card (status + 48h chart) -->
    <CarbonIntensityCard />

    <!-- Next 8 hours hourly breakdown -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Next 8 Hours</span>
          <UBadge label="Forecast" color="neutral" variant="subtle" size="xs" />
        </div>
      </template>

      <div v-if="!carbon" class="h-20 rounded-lg bg-elevated/40 animate-pulse" />

      <div v-else-if="nextHours.length === 0" class="text-sm text-muted py-4 text-center">
        No forecast data available.
      </div>

      <div v-else class="flex items-end justify-between gap-2">
        <div
          v-for="point in nextHours"
          :key="point.time"
          class="flex flex-col items-center gap-2 flex-1"
        >
          <!-- Bar -->
          <div class="w-full relative" style="height: 80px">
            <div
              class="absolute bottom-0 left-0 right-0 rounded-t transition-all"
              :class="statusConfig[getStatus(point.value)].bar"
              :style="{ height: barHeight(point.value), opacity: '0.85' }"
            />
          </div>
          <!-- Value -->
          <span
            class="text-[11px] font-semibold tabular-nums leading-none"
            :class="statusConfig[getStatus(point.value)].text"
          >{{ Math.round(point.value) }}</span>
          <!-- Time -->
          <span class="text-[10px] text-dimmed leading-none">{{ formatHour(point.time) }}</span>
        </div>
      </div>

      <template #footer>
        <p class="text-xs text-dimmed">Values in gCO₂/kWh · Source: Fingrid / Sähköjälki</p>
      </template>
    </UPageCard>

    <!-- Threshold guide -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-gauge" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Intensity Guide</span>
        </div>
      </template>

      <div class="divide-y divide-default -mx-4 sm:-mx-6">
        <div
          v-for="t in thresholds"
          :key="t.status"
          class="flex items-start gap-4 px-4 sm:px-6 py-4"
        >
          <div
            class="flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5 w-32 justify-center"
            :class="statusConfig[t.status].bg"
          >
            <span class="text-sm">{{ t.emoji }}</span>
            <span class="text-xs font-semibold" :class="statusConfig[t.status].text">{{ t.label }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-highlighted tabular-nums">{{ t.range }}</p>
            <p class="text-sm text-muted mt-0.5 leading-relaxed">{{ t.tip }}</p>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
