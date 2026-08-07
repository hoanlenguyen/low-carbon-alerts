<script setup lang="ts">
// Wire shape returned by /api/recommendation (JSON — timestamps serialized away).
interface RecommendationResponse {
  appliance: string
  bestTime: string | null
  carbonIntensity: number | null
  carbonSaving: 'low' | 'medium' | 'high'
  reason: string
  recommendation: string
  tip: string | null
  isColdStart: boolean
}

const { data: rec, refresh } = await useFetch<RecommendationResponse | null>('/api/recommendation')

const toast = useToast()
const refreshing = ref(false)

async function onRefresh() {
  refreshing.value = true
  try {
    await $fetch('/api/recommendation/refresh', { method: 'POST' })
    await refresh()
  } catch {
    toast.add({ title: 'Could not refresh', description: 'Please try again in a moment.', color: 'error' })
  } finally {
    refreshing.value = false
  }
}

const applianceIcons: Record<string, string> = {
  'ev charger': 'i-lucide-plug-zap',
  'dishwasher': 'i-lucide-utensils-crossed',
  'washing machine': 'i-lucide-washing-machine',
  'tumble dryer': 'i-lucide-shirt',
  'sauna': 'i-lucide-flame',
  'hot tub': 'i-lucide-bath',
  'heat pump': 'i-lucide-thermometer',
  'electric oven': 'i-lucide-cooking-pot'
}

const savingConfig = {
  high: { color: 'success' as const, label: 'High saving' },
  medium: { color: 'primary' as const, label: 'Medium saving' },
  low: { color: 'neutral' as const, label: 'Low saving' }
}

const applianceIcon = computed(() =>
  rec.value ? (applianceIcons[rec.value.appliance.toLowerCase()] ?? 'i-lucide-plug-zap') : 'i-lucide-plug-zap'
)
const savingCfg = computed(() =>
  rec.value ? savingConfig[rec.value.carbonSaving] : savingConfig.low
)
</script>

<template>
  <!-- Rendered only when a recommendation exists. Branching on `rec` (payload
       data, stable across SSR + hydration) rather than useFetch `status`
       avoids a hydration mismatch. -->
  <UPageCard v-if="rec" variant="subtle">
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-sparkles" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Recommended for you</span>
          <UBadge
            v-if="rec.isColdStart"
            color="neutral"
            variant="subtle"
            size="xs">
            Getting started
          </UBadge>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          size="xs"
          color="neutral"
          variant="ghost"
          :loading="refreshing"
          aria-label="Refresh recommendation"
          @click="onRefresh" />
      </div>
    </template>

    <div class="flex items-start gap-4">
      <div class="shrink-0 rounded-xl p-3 bg-primary/10">
        <UIcon :name="applianceIcon" class="size-6 text-primary" />
      </div>

      <div class="flex-1 min-w-0 space-y-2">
        <p class="text-sm font-medium text-highlighted leading-snug">
          {{ rec.recommendation }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
            icon="i-lucide-plug">
            {{ rec.appliance }}
          </UBadge>
          <UBadge
            v-if="rec.bestTime"
            color="primary"
            variant="subtle"
            size="sm"
            icon="i-lucide-clock">
            Best time: {{ rec.bestTime }}
          </UBadge>
          <UBadge
            :color="savingCfg.color"
            variant="subtle"
            size="sm"
            icon="i-lucide-leaf">
            {{ savingCfg.label }}
          </UBadge>
        </div>

        <p class="text-xs text-muted leading-relaxed">
          {{ rec.reason }}
        </p>

        <div v-if="rec.tip" class="flex items-start gap-2 rounded-lg bg-elevated/40 px-3 py-2 mt-1">
          <UIcon name="i-lucide-lightbulb" class="size-3.5 text-warning shrink-0 mt-0.5" />
          <p class="text-xs text-muted leading-relaxed">
            {{ rec.tip }}
          </p>
        </div>

        <p v-if="rec.isColdStart" class="text-xs text-dimmed pt-0.5">
          Based on typical usage for your household — we’ll tailor this as you use the app.
        </p>
      </div>
    </div>
  </UPageCard>
</template>
