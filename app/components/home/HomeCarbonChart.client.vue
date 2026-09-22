<script setup lang="ts">
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  label: string
  count: number // grams of CO2 saved in the bucket
}

const { width } = useElementSize(cardRef)

// Load via $fetch in a watcher (this is a client-only component; a plain fetch keeps the
// reactive series in sync with the date range without useFetch SSR/key subtleties).
const series = ref<{ total: number, data: DataRecord[] }>({ total: 0, data: [] })
async function load() {
  try {
    series.value = await $fetch('/api/admin/stats/carbon-saved', {
      query: {
        start: props.range.start.toISOString(),
        end: props.range.end.toISOString(),
        period: props.period
      }
    })
  } catch {
    series.value = { total: 0, data: [] }
  }
}
watch(() => [props.period, props.range] as const, load, { immediate: true })

const data = computed<DataRecord[]>(() => series.value?.data ?? [])

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

const total = computed(() => series.value?.total ?? 0)

const fmtG = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`)

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }
  return data.value[i].label
}

const template = (d: DataRecord) => `${d.label}: ${fmtG(d.count)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: 'px-0! pt-0! pb-3!' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5 tracking-wide">
          CO₂ Saved
        </p>
        <p class="text-3xl text-highlighted font-semibold tabular-nums">
          {{ fmtG(total) }}
        </p>
      </div>
    </template>

    <!-- Mount the chart only once data + a measured width are available, so unovis always
         renders bars on first paint (fixes empty bars on mobile). Keyed on width so it
         redraws crisply when the container size changes. -->
    <VisXYContainer
      v-if="data.length"
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width || undefined"
    >
      <VisStackedBar
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :rounded-corners="4"
        :bar-padding="0.4"
        :bar-max-width="28"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
    <div v-else class="h-96" />
  </UCard>
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
