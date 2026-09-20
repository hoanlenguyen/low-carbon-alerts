<script setup lang="ts">
// Editor for today's Appliance Schedule: one row per run (an appliance may be added
// several times), each with a start hour + run time priced against the per-hour forecast
// carbon. Used on /app/schedule. Prefills from the existing schedule and an optional
// suggested appliance.
const props = defineProps<{
  initial?: ScheduleEntry[]
  suggest?: string | null
}>()
const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const { applianceChoices, applianceItems, iconBySlug, saveSchedule, fmtG } = useSchedule()
const iconOf = (slug: string) => iconBySlug.value.get(slug) ?? 'i-lucide-plug'
const { points, hourOptions, avg24h, generatedAt } = useEmissionsForecast()
const STALE_MS = 24 * 60 * 60 * 1000
// Saving estimates are priced off the live forecast — block scheduling when the
// provider's data is stale (>24h old) so we don't record estimates from old data.
const isStale = computed(() => !!generatedAt.value && Date.now() - generatedAt.value.getTime() > STALE_MS)

const MAX_ROWS = 10
const choiceBySlug = (slug: string) => applianceChoices.value.find(c => c.slug === slug) ?? null

interface PickRow { slug: string, startMs: number, runTimeH: number }
const rows = ref<PickRow[]>([])
const submitting = ref(false)

const hourItems = computed(() => hourOptions.value.map(h => ({
  label: h.isTomorrow ? `${h.label} - tomorrow` : h.label,
  value: h.startMs
})))
const cleanestHourMs = computed(() => {
  if (!hourOptions.value.length) return 0
  return hourOptions.value.reduce((best, h) => (h.intensity < best.intensity ? h : best), hourOptions.value[0]!).startMs
})

// An appliance may run several times a day → all appliances stay selectable in every row.
const canAddMore = computed(() => rows.value.length < MAX_ROWS && applianceItems.value.length > 0)

function defaultRunH(slug: string) {
  const d = choiceBySlug(slug)?.durationMin
  return d ? Math.round((d / 60) * 4) / 4 : 1.5
}
// Baseline for the live preview is the forecast 24h average (avg24h from the composable);
// the server recomputes it authoritatively on save.
function rowEstimate(row: PickRow) {
  const ch = choiceBySlug(row.slug)
  const slices = runHourSlices(row.startMs, Math.round(row.runTimeH * 60), points.value)
  return estimateSavingHourly(ch?.powerKw ?? null, avg24h.value, slices)
}
const totalG = computed(() => rows.value.reduce((s, r) => s + rowEstimate(r).savingG, 0))

function addRow(slug?: string) {
  const chosen = slug ?? applianceItems.value[0]?.value
  if (!chosen)
    return
  rows.value.push({ slug: chosen, startMs: cleanestHourMs.value, runTimeH: defaultRunH(chosen) })
}
function removeRow(i: number) {
  rows.value.splice(i, 1)
}
function onSlugChange(row: PickRow) {
  row.runTimeH = defaultRunH(row.slug)
}

function init() {
  rows.value = []
  for (const e of props.initial ?? []) {
    rows.value.push({
      slug: e.applianceSlug,
      startMs: e.startAtMs,
      runTimeH: e.runTimeMin ? Math.round((e.runTimeMin / 60) * 4) / 4 : defaultRunH(e.applianceSlug)
    })
  }
  if (!rows.value.length) {
    const suggested = props.suggest && applianceItems.value.some(c => c.value === props.suggest)
      ? props.suggest
      : undefined
    addRow(suggested)
  }
}
// Rebuild when the appliance list arrives (client-only fetch) or the suggestion changes.
watch([() => props.suggest, () => props.initial, applianceItems], init, { immediate: true })

async function save() {
  if (!rows.value.length || isStale.value) return
  submitting.value = true
  try {
    await saveSchedule(rows.value.map(r => ({
      applianceSlug: r.slug,
      startAtMs: r.startMs,
      runTimeMin: Math.round(r.runTimeH * 60)
    })))
    toast.add({ title: 'Schedule saved', description: 'Your estimated savings were recorded.', color: 'success' })
    emit('saved')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Could not save', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- One card per run -->
    <div class="space-y-2.5">
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="relative rounded-xl border border-default bg-elevated/40 p-3.5 pr-10">
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          class="absolute right-2 top-2"
          aria-label="Remove run"
          @click="removeRow(i)" />

        <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
          <!-- Appliance -->
          <div class="min-w-0 flex-1 basis-48">
            <label class="block text-[10px] font-medium uppercase tracking-wide text-dimmed mb-1">Appliance</label>
            <USelectMenu
              v-model="row.slug"
              :items="applianceItems"
              :icon="iconOf(row.slug)"
              value-key="value"
              placeholder="Appliance"
              size="sm"
              class="w-full"
              @update:model-value="onSlugChange(row)" />
          </div>
          <!-- Start -->
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wide text-dimmed mb-1">Start</label>
            <USelectMenu
              v-model="row.startMs"
              :items="hourItems"
              value-key="value"
              placeholder="Start hour"
              size="sm"
              class="w-32" />
          </div>
          <!-- Duration -->
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wide text-dimmed mb-1">Duration (h)</label>
            <UInputNumber
              v-model="row.runTimeH"
              :min="0.25"
              :step="0.25"
              size="sm"
              class="w-24" />
          </div>
          <!-- Estimated saving -->
          <div class="ml-auto text-right">
            <p class="text-[10px] font-medium uppercase tracking-wide text-dimmed mb-1">
              Est. saving
            </p>
            <p class="text-sm font-semibold text-success tabular-nums">
              ≈ {{ fmtG(rowEstimate(row).savingG) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add another run -->
    <UButton
      v-if="canAddMore"
      block
      size="sm"
      variant="soft"
      color="neutral"
      icon="i-lucide-plus"
      :disabled="isStale"
      class="border border-dashed border-default"
      @click="addRow()">
      Add appliance
    </UButton>

    <!-- Total summary -->
    <div class="flex items-center justify-between rounded-lg bg-primary/5 px-3.5 py-2.5">
      <span class="text-xs font-medium text-muted">
        Estimated total saving
        <span class="text-dimmed">· {{ rows.length }} run{{ rows.length === 1 ? '' : 's' }}</span>
      </span>
      <span class="text-base font-semibold text-success tabular-nums">≈ {{ fmtG(totalG) }} CO₂</span>
    </div>

    <!-- Stale-forecast notice: scheduling disabled -->
    <div
      v-if="isStale"
      class="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-warning">
      <UIcon name="i-lucide-triangle-alert" class="size-4 shrink-0 mt-0.5" />
      <p class="text-xs leading-relaxed">
        The forecast is out of date, so scheduling is paused — saving estimates need current
        grid data. Please try again once the forecast refreshes.
      </p>
    </div>

    <!-- Save on its own line -->
    <div class="flex justify-end">
      <UButton
        size="md"
        icon="i-lucide-check"
        :loading="submitting"
        :disabled="!rows.length || isStale"
        @click="save">
        Save schedule
      </UButton>
    </div>

    <!-- How the estimate is calculated -->
    <div class="rounded-lg border border-dashed border-default bg-elevated/30 p-3">
      <p class="text-[11px] font-semibold text-muted">
        How we estimate your saving
      </p>
      <p class="text-[11px] text-muted font-mono mt-1 leading-relaxed">
        CO₂ ≈ power (kW) × Σ hours × (24h-average − carbon at that hour)
      </p>
      <p class="text-[11px] text-dimmed mt-1 leading-relaxed">
        Each hour of the run is priced with that hour's forecast carbon. Running into a
        dirtier hour lowers the saving; it's an estimate from grid data — never below zero.
      </p>
      <p class="text-[11px] text-dimmed mt-1 leading-relaxed">
        The appliance power is an estimated average for that type — your actual device may
        draw more or less.
      </p>
    </div>
  </div>
</template>
