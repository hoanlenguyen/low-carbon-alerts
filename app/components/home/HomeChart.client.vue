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
  count: number
}

const { width } = useElementSize(cardRef)

// (labels are pre-formatted in Helsinki time by the endpoint).
const { data: series } = useFetch('/api/admin/stats/messages-sent', {
  lazy: true,
  query: computed(() => ({
    start: props.range.start.toISOString(),
    end: props.range.end.toISOString(),
    period: props.period
  })),
  default: () => ({ total: 0, data: [] as DataRecord[] })
})

const data = computed<DataRecord[]>(() => series.value?.data ?? [])

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

const total = computed(() => series.value?.total ?? 0)

const formatNumber = (n: number) => n.toLocaleString()

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return data.value[i].label
}

const template = (d: DataRecord) => `${d.label}: ${formatNumber(d.count)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: 'px-0! pt-0! pb-3!' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5 tracking-wide">
          Messages Sent
        </p>
        <p class="text-3xl text-highlighted font-semibold tabular-nums">
          {{ formatNumber(total) }}
        </p>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
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
