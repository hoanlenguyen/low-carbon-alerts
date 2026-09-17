<script setup lang="ts">
import type { ForecastKey } from '~/server/api/forecast/[series].get'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

// Main chart series selector — synced via v-model with GridForecastCard.
const selectedSeries = ref<ForecastKey>('consumption_emissions')

// Hourly carbon strip + 24h average baseline (carbon-only, mirrors the schedule page).
const { avg24h } = useEmissionsForecast()
const fmtCarbon = (n: number) => String(Number(n.toFixed(2)))

// Reading the chart: CarbonHourStrip colours each hour by where it falls within the next
// 24 hours (relative terciles), so the description explains the bands rather than fixed
// thresholds.
const bandGuide = [
  {
    key: 'clean',
    bg: 'bg-success/10',
    text: 'text-success',
    emoji: '🍃',
    label: 'Cleanest',
    tip: 'The greenest third of the next 24 hours — best time to run the dishwasher, laundry, EV charging or the water heater.'
  },
  {
    key: 'mid',
    bg: 'bg-warning/10',
    text: 'text-warning',
    emoji: '⚖️',
    label: 'Middle',
    tip: 'The middle third, around the 24-hour average. No strong reason to rush or delay.'
  },
  {
    key: 'dirty',
    bg: 'bg-error/10',
    text: 'text-error',
    emoji: '🔥',
    label: 'Highest',
    tip: 'The highest-carbon third — delay heavy, flexible loads if you can; a cleaner hour is likely nearby.'
  }
] as const
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

    <!-- Forecast carbon by hour (24h) -->
    <section>
      <div class="mb-4 flex flex-col md:flex-row justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Forecast carbon by hour (gCO₂/kWh) in 24 hours
          </h2>
          <p class="text-sm text-muted">
            Lower is cleaner — schedule flexible loads into the green hours.
          </p>
        </div>
        <UBadge
          v-if="avg24h != null"
          color="primary"
          variant="soft"
          size="sm">
          24h average · {{ fmtCarbon(avg24h) }} gCO₂/kWh
        </UBadge>
      </div>

      <UPageCard variant="subtle">
        <CarbonHourStrip />
      </UPageCard>
    </section>

    <!-- Reading the Chart -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-gauge" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Reading the Chart</span>
        </div>
      </template>

      <div class="divide-y divide-default -mx-4 sm:-mx-6">
        <div
          v-for="b in bandGuide"
          :key="b.key"
          class="flex items-start gap-4 px-4 sm:px-6 py-4"
        >
          <div
            class="flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5 w-28 justify-center"
            :class="b.bg"
          >
            <span class="text-sm">{{ b.emoji }}</span>
            <span class="text-xs font-semibold" :class="b.text">{{ b.label }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-muted leading-relaxed">
              {{ b.tip }}
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <p class="text-xs text-dimmed">
          Colours are relative to the next 24 hours (not fixed thresholds), so the cleanest and highest hours stand out even on a very clean or very dirty day. “Tomorrow” marks hours past midnight. Source: Fingrid / Sähköjälki.
        </p>
      </template>
    </UPageCard>
  </div>
</template>
