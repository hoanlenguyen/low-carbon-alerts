<!-- eslint-disable vue/html-closing-bracket-newline -->
<script setup lang="ts">
import type { ForecastData, ForecastKey } from '~/server/api/forecast/[series].get'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const TZ = 'Europe/Helsinki'

type StatusKey = 'excellent' | 'good' | 'moderate' | 'high'

const statusConfig: Record<StatusKey, { bg: string, text: string, bar: string }> = {
  excellent: { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success' },
  good: { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  moderate: { bg: 'bg-warning/10', text: 'text-warning', bar: 'bg-warning' },
  high: { bg: 'bg-error/10', text: 'text-error', bar: 'bg-error' }
}

function getStatus(value: number, higherIsBetter: boolean): StatusKey {
  if (higherIsBetter) {
    if (value > 80) return 'excellent'
    if (value > 60) return 'good'
    if (value > 40) return 'moderate'
    return 'high'
  }
  if (value < 20) return 'excellent'
  if (value < 30) return 'good'
  if (value < 50) return 'moderate'
  return 'high'
}

// Synced via v-model with GridForecastCard
const selectedSeries = ref<ForecastKey>('consumption_emissions')

// Separate fetch for hourly + guide sections — same endpoint, shares SWR cache
const { data, status } = useFetch<ForecastData>(() => `/api/forecast/${selectedSeries.value}`, {
  watch: [selectedSeries]
})

const nextHours = computed(() => {
  if (!data.value) return []
  const now = Date.now()
  return data.value.points
    .filter(p => p.isForecast && p.time >= now)
    .slice(0, 8)
})

function barHeight(value: number, higherIsBetter: boolean): string {
  const pct = higherIsBetter
    ? Math.max(4, Math.min(100, Math.round(value)))
    : Math.max(4, Math.min(100, Math.round(value / 70 * 100)))
  return pct + '%'
}

function formatHour(ms: number) {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

const guides: Record<ForecastKey, Array<{ status: StatusKey, emoji: string, label: string, range: string, tip: string }>> = {
  consumption_emissions: [
    { status: 'excellent', emoji: '🍃', label: 'Excellent', range: '< 20 gCO₂/kWh', tip: 'Run dishwasher, EV charging, laundry, water heater — now is the time.' },
    { status: 'good', emoji: '💧', label: 'Good', range: '20–30 gCO₂/kWh', tip: 'Better than average. Go ahead with energy-intensive tasks.' },
    { status: 'moderate', emoji: '☁️', label: 'Moderate', range: '30–50 gCO₂/kWh', tip: 'Typical Finnish grid mix. No urgent reason to delay or rush.' },
    { status: 'high', emoji: '🔥', label: 'High', range: '> 50 gCO₂/kWh', tip: 'Delay heavy loads if you can — a lower-carbon window is likely coming.' }
  ],
  renew_production_share: [
    { status: 'excellent', emoji: '🌬️', label: 'High', range: '> 80%', tip: 'Very high renewable penetration — excellent time to use electricity.' },
    { status: 'good', emoji: '🌿', label: 'Good', range: '60–80%', tip: 'Mostly renewable energy. Go ahead with heavy loads.' },
    { status: 'moderate', emoji: '⚖️', label: 'Mixed', range: '40–60%', tip: 'Significant fossil contribution in the grid mix.' },
    { status: 'high', emoji: '⛽', label: 'Low', range: '< 40%', tip: 'High fossil share — consider delaying non-urgent heavy loads.' }
  ],
  domestic_production_share: [
    { status: 'excellent', emoji: '🏠', label: 'High', range: '> 80%', tip: 'Nearly all electricity produced within Finland.' },
    { status: 'good', emoji: '✅', label: 'Good', range: '60–80%', tip: 'Mostly domestic production, low import reliance.' },
    { status: 'moderate', emoji: '🔄', label: 'Mixed', range: '40–60%', tip: 'Significant import from neighboring countries.' },
    { status: 'high', emoji: '📥', label: 'Low', range: '< 40%', tip: 'High import dependency — grid relies heavily on electricity imports.' }
  ]
}

const currentGuide = computed(() => guides[selectedSeries.value])
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-xl font-semibold text-highlighted">
        Forecast
      </h1>
    </div>

    <!-- Shared card — v-model keeps selectedSeries in sync with the card's selector -->
    <GridForecastCard v-model="selectedSeries" />

    <!-- Next 8 hours hourly breakdown -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Next 8 Hours</span>
          <UBadge
            label="Forecast"
            color="neutral"
            variant="subtle"
            size="xs" />
        </div>
      </template>

      <div v-if="status === 'pending'" class="h-28 rounded-lg bg-elevated/40 animate-pulse" />

      <div v-else-if="!nextHours.length" class="text-sm text-muted py-4 text-center">
        No forecast data available.
      </div>

      <div v-else class="flex items-end justify-between gap-2">
        <div
          v-for="point in nextHours"
          :key="point.time"
          class="flex flex-col items-center gap-2 flex-1"
        >
          <div class="w-full relative" style="height: 80px">
            <div
              class="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
              :class="statusConfig[getStatus(point.value, data?.higherIsBetter ?? false)].bar"
              :style="{ height: barHeight(point.value, data?.higherIsBetter ?? false), opacity: '0.8' }"
            />
          </div>
          <span
            class="text-[11px] font-semibold tabular-nums leading-none"
            :class="statusConfig[getStatus(point.value, data?.higherIsBetter ?? false)].text"
          >{{ Math.round(point.value) }}</span>
          <span class="text-[10px] text-dimmed leading-none">{{ formatHour(point.time) }}</span>
        </div>
      </div>

      <template #footer>
        <p class="text-xs text-dimmed">
          Values in {{ data?.unit ?? '…' }} · Source: Fingrid / Sähköjälki
        </p>
      </template>
    </UPageCard>

    <!-- Series guide -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-gauge" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Reading the Chart</span>
        </div>
      </template>

      <div class="divide-y divide-default -mx-4 sm:-mx-6">
        <div
          v-for="t in currentGuide"
          :key="t.status"
          class="flex items-start gap-4 px-4 sm:px-6 py-4"
        >
          <div
            class="flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5 w-28 justify-center"
            :class="statusConfig[t.status].bg"
          >
            <span class="text-sm">{{ t.emoji }}</span>
            <span class="text-xs font-semibold" :class="statusConfig[t.status].text">{{ t.label }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-highlighted tabular-nums">
              {{ t.range }}
            </p>
            <p class="text-sm text-muted mt-0.5 leading-relaxed">
              {{ t.tip }}
            </p>
          </div>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
