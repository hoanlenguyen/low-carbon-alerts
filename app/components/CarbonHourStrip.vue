<script setup lang="ts">
// Forecast carbon intensity by hour (gCO₂/kWh), colour-banded clean→dirty, with a
// "Tomorrow" divider where the horizon crosses midnight. Wrapping flexbox so it reflows
// to any width. Shared by the forecast page, the schedule page (standalone) and the
// schedule editor. Shows a loading skeleton while fetching, and — when the provider's data
// is stale (>24h old) or has no upcoming hours — a warning plus a clear "unavailable"
// message instead of rendering misleading old bars or a blank card.
const { displayHours, status, generatedAt } = useEmissionsForecast()

const fmtCarbon = (n: number) => String(Number(n.toFixed(2)))
const bandClass: Record<'clean' | 'mid' | 'dirty', string> = {
  clean: 'text-success', mid: 'text-warning', dirty: 'text-error'
}

const STALE_MS = 24 * 60 * 60 * 1000
const isStale = computed(() => !!generatedAt.value && Date.now() - generatedAt.value.getTime() > STALE_MS)

const updatedAbs = computed(() => generatedAt.value
  ? generatedAt.value.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki'
    })
  : null)

function relTime(d: Date): string {
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}
const updatedRel = computed(() => (generatedAt.value ? relTime(generatedAt.value) : null))

// Show the strip whenever there are hours to plot (even if stale — the warning banner
// flags it; scheduling is blocked elsewhere). Only fall back to the message when there's
// genuinely nothing to show.
const showStrip = computed(() => displayHours.value.length > 0)
const showUnavailable = computed(() =>
  !displayHours.value.length && (status.value === 'success' || status.value === 'error')
)
</script>

<template>
  <div>
    <!-- Staleness warning (forecast provider hasn't refreshed in >24h) -->
    <div
      v-if="isStale"
      class="mb-3 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-warning">
      <UIcon name="i-lucide-triangle-alert" class="size-4 shrink-0 mt-0.5" />
      <p class="text-xs leading-relaxed">
        Forecast data may be out of date. Last updated {{ updatedAbs }}.
      </p>
    </div>

    <!-- Hourly strip (fresh data only) -->
    <div v-if="showStrip">
      <div class="flex flex-wrap items-end gap-1">
        <template v-for="(h, i) in displayHours" :key="h.startMs">
          <div
            v-if="h.isTomorrow && (i === 0 || !displayHours[i - 1]?.isTomorrow)"
            class="w-full text-[10px] font-medium text-dimmed uppercase tracking-wide mt-1">
            Tomorrow
          </div>
          <div
            class="flex flex-col items-center rounded px-1.5 py-1 w-11 shrink-0 text-center"
            :class="h.band === 'clean' ? 'bg-success/10' : h.band === 'dirty' ? 'bg-error/10' : 'bg-warning/10'">
            <span class="text-[10px] text-dimmed">{{ h.label }}</span>
            <span class="text-[11px] font-medium" :class="bandClass[h.band]">{{ fmtCarbon(h.intensity) }}</span>
          </div>
        </template>
      </div>

      <p v-if="updatedRel" class="mt-2 text-[11px] text-dimmed">
        Last updated {{ updatedRel }}
      </p>
    </div>

    <!-- Stale or no upcoming hours -->
    <div v-else-if="showUnavailable" class="py-4 text-sm text-muted text-center">
      Hourly forecast isn't available right now — please check back later.
    </div>

    <!-- Loading skeleton -->
    <div v-else class="flex flex-wrap gap-1" aria-hidden="true">
      <div
        v-for="n in 12"
        :key="n"
        class="h-12 w-11 rounded bg-elevated/40 animate-pulse" />
    </div>
  </div>
</template>
