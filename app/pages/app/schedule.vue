<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const route = useRoute()
const toast = useToast()
const {
  entries, totalG, hasToday, applianceChoices, iconBySlug, clearSchedule, fmtG, status
} = useSchedule()
const { avg24h } = useEmissionsForecast()
const fmtCarbon = (n: number) => String(Number(n.toFixed(2)))

const suggest = computed(() => (typeof route.query.suggest === 'string' ? route.query.suggest : null))
const nameOf = (slug: string) => applianceChoices.value.find(c => c.slug === slug)?.name ?? slug
const iconOf = (slug: string) => iconBySlug.value.get(slug) ?? 'i-lucide-plug'
const powerOf = (slug: string) => applianceChoices.value.find(c => c.slug === slug)?.powerKw ?? null
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki'
})
const fmtH = (min: number) => (min / 60).toFixed(2).replace(/\.?0+$/, '')

// Edit mode: open automatically ONCE (when the schedule first loads) if there's nothing
// scheduled yet, or we arrived from a smart alert with a suggested appliance. After that
// it's user-controlled (Edit / Save / Cancel), so saving closes it even though ?suggest
// stays in the URL.
const editing = ref(false)
let decidedAutoOpen = false
watch(status, (s) => {
  if (!decidedAutoOpen && (s === 'success' || s === 'error')) {
    decidedAutoOpen = true
    editing.value = !hasToday.value || !!suggest.value
  }
}, { immediate: true })

const clearing = ref(false)
async function onClear() {
  clearing.value = true
  try {
    await clearSchedule()
    editing.value = true
    toast.add({ title: 'Schedule cleared', color: 'neutral' })
  } finally {
    clearing.value = false
  }
}

// Past schedules (compact log).
const { data: history } = useFetch<{ days: { day: string, runs: number, totalG: number }[] }>(
  '/api/schedule/history',
  { key: 'schedule-history', server: false, lazy: true, default: () => ({ days: [] }) }
)
const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Europe/Helsinki'
})
</script>

<template>
  <div class="space-y-8">
    <!-- Page title -->
    <div>
      <h1 class="text-xl font-semibold text-highlighted">
        Appliance Schedule
      </h1>
      <p class="text-sm text-muted mt-0.5">
        Log the flexible loads you shifted into cleaner hours today, and see the CO₂ you avoided.
      </p>
    </div>

    <!-- Forecast carbon by hour -->
    <section>
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Forecast carbon by hour (gCO₂/kWh)
          </h2>
          <p class="text-sm text-muted">
            Lower is cleaner — schedule flexible loads into the green hours.
          </p>
        </div>
        <UBadge
          v-if="avg24h != null"
          color="neutral"
          variant="subtle"
          size="sm"
          class="shrink-0">
          24h average · {{ fmtCarbon(avg24h) }} gCO₂/kWh
        </UBadge>
      </div>

      <UPageCard variant="subtle">
        <CarbonHourStrip />
      </UPageCard>
    </section>

    <!-- Today -->
    <section>
      <div class="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Today
          </h2>
          <p class="text-sm text-muted">
            <template v-if="hasToday">
              {{ entries.length }} run{{ entries.length === 1 ? '' : 's' }} · ≈ {{ fmtG(totalG) }} CO₂ saved
            </template>
            <template v-else>
              Nothing scheduled yet.
            </template>
          </p>
        </div>
        <div v-if="hasToday && !editing" class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="soft"
            icon="i-lucide-pencil"
            @click="editing = true">
            Edit
          </UButton>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-trash-2"
            :loading="clearing"
            @click="onClear">
            Clear
          </UButton>
        </div>
      </div>

      <UPageCard variant="subtle">
        <!-- Editor -->
        <SchedulePicker
          v-if="editing"
          :initial="entries"
          :suggest="suggest"
          @saved="editing = false" />

        <!-- Read-only list -->
        <ul v-else-if="hasToday" class="min-w-0 divide-y divide-default">
          <li v-for="e in entries" :key="e.id" class="flex items-center gap-3 py-2.5">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon :name="iconOf(e.applianceSlug)" class="size-5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-highlighted truncate">
                {{ nameOf(e.applianceSlug) }}
                <span v-if="powerOf(e.applianceSlug) != null" class="font-normal text-muted">· {{ powerOf(e.applianceSlug) }} kW</span>
              </p>
              <p class="text-xs text-muted">
                Start at: <strong>{{ hhmm(e.startAtMs) }}</strong>
                · Run time: <strong>{{ fmtH(e.runTimeMin) }}</strong> h
                <span v-if="e.carbonAtStart != null" class="text-dimmed">· Carbon emissions: <strong>{{ e.carbonAtStart }}</strong> gCO₂/kWh</span>
              </p>
            </div>
            <span class="text-sm font-medium text-success shrink-0">≈ {{ fmtG(e.estimatedSavingG) }}</span>
          </li>
        </ul>
      </UPageCard>
    </section>

    <!-- History -->
    <section v-if="history?.days?.length">
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Earlier days
        </h2>
        <p class="text-sm text-muted">
          Your recent shifting history.
        </p>
      </div>

      <UPageCard variant="subtle">
        <ul class="divide-y divide-default">
          <li v-for="d in history.days" :key="d.day" class="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p class="text-sm font-medium text-highlighted">
                {{ dayLabel(d.day) }}
              </p>
              <p class="text-xs text-muted">
                {{ d.runs }} run{{ d.runs === 1 ? '' : 's' }}
              </p>
            </div>
            <span class="text-sm font-medium text-success shrink-0">≈ {{ fmtG(d.totalG) }}</span>
          </li>
        </ul>
      </UPageCard>
    </section>
  </div>
</template>
