<script setup lang="ts">
import { Line } from '@unovis/ts'
import { VisXYContainer, VisLine, VisArea, VisAxis, VisTooltip, VisPlotline, VisPlotband } from '@unovis/vue'
import type { CarbonPoint } from '~/server/api/carbon.get'

const props = defineProps<{
  points: CarbonPoint[]
  forecastStartMs: number
  unit?: string
}>()

const historyData = computed(() => props.points.filter(p => !p.isForecast))
const forecastData = computed(() => props.points.filter(p => p.isForecast))
const allData = computed(() => [...props.points].sort((a, b) => a.time - b.time))

const x = (d: CarbonPoint) => d.time
const y = (d: CarbonPoint) => d.value

const TZ = 'Europe/Helsinki'

const tickFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ })
const tooltipFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ })

const xTicks = (t: number) => tickFmt.format(new Date(t))

// Generate tick positions at clean 6-hour boundaries in Helsinki time
const xTickValues = computed<number[]>(() => {
  if (!allData.value.length) return []
  const HOUR_MS = 3_600_000
  const INTERVAL = 6 * HOUR_MS
  const start = allData.value[0].time
  const end = allData.value[allData.value.length - 1].time

  // Derive Helsinki UTC offset at the start of the data
  const d = new Date(start)
  const helsinkiHour = parseInt(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(d))
  let offsetH = (helsinkiHour - d.getUTCHours() + 24) % 24
  if (offsetH > 12) offsetH -= 24
  const offsetMs = offsetH * HOUR_MS

  // Round up to the next 6-hour boundary in Helsinki, then convert back to UTC ms
  const firstTick = Math.ceil((start + offsetMs) / INTERVAL) * INTERVAL - offsetMs

  const ticks: number[] = []
  for (let t = firstTick; t <= end; t += INTERVAL) ticks.push(t)
  return ticks
})

const tooltipTriggers = computed(() => ({
  [Line.selectors.line]: (d: CarbonPoint) => {
    const time = tooltipFmt.format(new Date(d.time))
    return `<span style="white-space:nowrap">${time} · <b>${d.value}</b> ${props.unit ?? 'gCO₂/kWh'}${d.isForecast ? ' · forecast' : ''}</span>`
  }
}))

const nowX = Date.now()
</script>

<template>
  <div class="w-full">
    <VisXYContainer
      :data="allData"
      :x="x"
      :y="y"
      :y-domain="[0, undefined]"
      :padding="{ top: 16, bottom: 4 }"
      class="h-52 w-full"
    >
      <!-- "Excellent" zone band 0–20 gCO₂ (axis y = horizontal band) -->
      <VisPlotband
        :from="0"
        :to="20"
        axis="y"
        color="rgba(34,197,94,0.07)"
      />

      <!-- History area + line -->
      <VisArea
        :data="historyData"
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.15"
      />
      <VisLine
        :data="historyData"
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :line-width="2"
      />

      <!-- Forecast line dashed -->
      <VisLine
        :data="forecastData"
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :line-width="2"
        :line-dash-array="[5, 4]"
        :opacity="0.5"
      />

      <!-- "Now" vertical plotline (axis x = vertical) -->
      <VisPlotline
        :value="nowX"
        axis="x"
        color="rgba(148,163,184,0.5)"
        :line-width="1"
        label-text="Now"
      />

      <!-- Threshold plotline at 20 gCO₂ (axis y = horizontal) -->
      <VisPlotline
        :value="20"
        axis="y"
        color="rgba(34,197,94,0.5)"
        :line-width="1"
        label-text="Excellent"
        label-position="right"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
        :tick-values="xTickValues"
      />

      <VisAxis
        type="y"
        :tick-format="(v: number) => `${v}`"
        :num-ticks="4"
      />

      <VisTooltip :triggers="tooltipTriggers" />
    </VisXYContainer>
  </div>
</template>

<style scoped>
.unovis-xy-container {
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
