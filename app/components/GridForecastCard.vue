<script setup lang="ts">
import type { GridSeriesData, GridSeriesKey } from '~/server/api/grid/[series].get'

const seriesOptions: Array<{ key: GridSeriesKey, label: string, icon: string, description: string }> = [
  { key: 'consumption_emissions', label: 'Carbon', icon: 'i-lucide-leaf', description: 'CO₂ emitted per kWh consumed' },
  { key: 'renew_production_share', label: 'Renewable', icon: 'i-lucide-wind', description: 'Share of electricity from renewables' },
  { key: 'domestic_production_share', label: 'Domestic', icon: 'i-lucide-home', description: 'Share produced domestically vs imported' }
]

const props = defineProps<{ modelValue?: GridSeriesKey }>()
const emit = defineEmits<{ 'update:modelValue': [key: GridSeriesKey] }>()

const selectedSeries = ref<GridSeriesKey>(props.modelValue ?? 'consumption_emissions')

watch(() => props.modelValue, (v) => { if (v) selectedSeries.value = v })
watch(selectedSeries, v => emit('update:modelValue', v))

const { data, status } = useFetch<GridSeriesData>(() => `/api/grid/${selectedSeries.value}`, {
  watch: [selectedSeries]
})

type StatusKey = 'excellent' | 'good' | 'moderate' | 'high'

const statusConfig: Record<StatusKey, { bg: string, text: string, icon: string }> = {
  excellent: { bg: 'bg-success/10', text: 'text-success', icon: 'i-lucide-leaf' },
  good: { bg: 'bg-primary/10', text: 'text-primary', icon: 'i-lucide-zap' },
  moderate: { bg: 'bg-warning/10', text: 'text-warning', icon: 'i-lucide-cloud' },
  high: { bg: 'bg-error/10', text: 'text-error', icon: 'i-lucide-flame' }
}

const statusBadgeColor: Record<StatusKey, 'success' | 'primary' | 'warning' | 'error'> = {
  excellent: 'success', good: 'primary', moderate: 'warning', high: 'error'
}

const statusLabels: Record<GridSeriesKey, Record<StatusKey, string>> = {
  consumption_emissions: { excellent: 'Excellent', good: 'Good', moderate: 'Moderate', high: 'High' },
  renew_production_share: { excellent: 'High', good: 'Good', moderate: 'Mixed', high: 'Low' },
  domestic_production_share: { excellent: 'High', good: 'Good', moderate: 'Mixed', high: 'Low' }
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

const currentStatus = computed<StatusKey>(() =>
  data.value ? getStatus(data.value.current, data.value.higherIsBetter) : 'moderate'
)
const currentCfg = computed(() => statusConfig[currentStatus.value])

function timeAgo(val: string): string {
  const diff = Date.now() - new Date(val).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

const selectedOption = computed(() => seriesOptions.find(s => s.key === selectedSeries.value)!)
</script>

<template>
  <UCard :ui="{ body: 'px-4 py-4 sm:px-6 sm:py-5' }">
    <template #header>
      <div class="flex flex-col gap-3 px-4 pt-4 sm:px-6 pb-0">
        <!-- Title row -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-activity" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Grid Forecast · Finland</span>
        </div>
        <!-- Series selector -->
        <div class="flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            v-for="s in seriesOptions"
            :key="s.key"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap"
            :class="selectedSeries === s.key
              ? 'bg-primary border-primary text-white'
              : 'bg-elevated border-default text-muted hover:text-highlighted hover:border-muted'"
            @click="selectedSeries = s.key"
          >
            <UIcon :name="s.icon" class="size-3.5 shrink-0" />
            {{ s.label }}
          </button>
        </div>
      </div>
    </template>

    <!-- Skeleton -->
    <div v-if="status === 'pending'" class="space-y-3">
      <div class="h-14 rounded-xl bg-elevated/50 animate-pulse" />
      <div class="h-48 rounded-lg bg-elevated/40 animate-pulse" />
    </div>

    <template v-else-if="data">
      <!-- Current value row -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 mb-4">
        <div
          class="flex items-center gap-3 shrink-0 rounded-xl px-3 py-2.5"
          :class="currentCfg.bg"
        >
          <UIcon :name="currentCfg.icon" class="size-6" :class="currentCfg.text" />
          <div>
            <p class="text-2xl font-bold tabular-nums leading-none" :class="currentCfg.text">
              {{ data.current }}
            </p>
            <p class="text-xs text-muted mt-0.5">
              {{ data.unit }} · now
            </p>
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm text-muted">
            {{ selectedOption.description }}
          </p>
          <div class="flex flex-wrap items-center gap-2 mt-1.5">
            <UBadge
              :color="statusBadgeColor[currentStatus]"
              variant="subtle"
              size="sm"
            >
              {{ statusLabels[selectedSeries][currentStatus] }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- 48h chart -->
      <div>
        <p class="text-xs text-dimmed mb-2 flex items-center gap-2">
          <span>Past 24h + 24h forecast</span>
          <span class="inline-flex items-center gap-1 opacity-60">
            <span class="inline-block w-4 border-t-2 border-primary/60 border-dashed" />
            <span>forecast</span>
          </span>
        </p>
        <ClientOnly>
          <AppCarbonChart
            :points="data.points"
            :forecast-start-ms="data.forecastStartMs"
            :unit="data.unit"
          />
          <template #fallback>
            <div class="h-48 bg-elevated/40 rounded-lg animate-pulse" />
          </template>
        </ClientOnly>
      </div>

      <p class="text-xs text-dimmed mt-3">
        Source: Fingrid / Sähköjälki · Updated {{ timeAgo(data.generatedAt) }}
      </p>
    </template>
  </UCard>
</template>
