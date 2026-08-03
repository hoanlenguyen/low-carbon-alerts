<script setup lang="ts">
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip, VisPlotline, VisPlotband } from '@unovis/vue'
import type { CarbonPoint } from '~/server/api/carbon.get'

const props = defineProps<{
  points: CarbonPoint[]
  forecastStartMs: number
}>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

const historyData = computed(() => props.points.filter(p => !p.isForecast))
const forecastData = computed(() => props.points.filter(p => p.isForecast))
const allData = computed(() => [...props.points].sort((a, b) => a.time - b.time))

const x = (d: CarbonPoint) => d.time
const y = (d: CarbonPoint) => d.value

const xTicks = (t: number) => {
  const d = new Date(t)
  const h = d.getHours()
  if (h % 6 !== 0) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const tooltip = (d: CarbonPoint) => {
  const time = new Date(d.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', weekday: 'short' })
  return `${time} · ${d.value.toFixed(1)} gCO₂/kWh${d.isForecast ? ' (forecast)' : ''}`
}

const nowX = Date.now()
</script>

<template>
  <div ref="cardRef" class="w-full">
    <VisXYContainer
      :data="allData"
      :padding="{ top: 16, bottom: 4 }"
      class="h-52"
      :width="width"
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
        :num-ticks="6"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="tooltip"
      />

      <VisTooltip />
    </VisXYContainer>
  </div>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
