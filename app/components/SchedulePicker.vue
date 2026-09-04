<script setup lang="ts">
// Editor for today's Appliance Schedule: one row per run (an appliance may be added
// several times), each with a start hour + run time priced against the per-hour forecast
// carbon. Used on /app/schedule. Prefills from the existing schedule and an optional
// suggested appliance.
const props = defineProps<{
  initial?: ScheduleEntry[]
  suggest?: string | null
}>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const toast = useToast()
const { applianceChoices, applianceItems, saveSchedule, fmtG } = useSchedule()
const { points, hourOptions } = useEmissionsForecast()

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
  if (!hourOptions.value.length) return Date.now()
  return hourOptions.value.reduce((best, h) => (h.intensity < best.intensity ? h : best), hourOptions.value[0]!).startMs
})

// An appliance may run several times a day → all appliances stay selectable in every row.
const canAddMore = computed(() => rows.value.length < MAX_ROWS && applianceItems.value.length > 0)

function defaultRunH(slug: string) {
  const d = choiceBySlug(slug)?.durationMin
  return d ? Math.round((d / 60) * 4) / 4 : 1.5
}
// Baseline for the live preview: the day's grid average. We don't have the server's
// exact value client-side, so approximate with the mean of the visible forecast hours
// (the server recomputes it authoritatively on save).
const avg24h = computed<number | null>(() => {
  const vals = hourOptions.value.map(h => h.intensity)
  if (!vals.length) return null
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
})
function rowEstimate(row: PickRow) {
  const ch = choiceBySlug(row.slug)
  const slices = runHourSlices(row.startMs, Math.round(row.runTimeH * 60), points.value)
  return estimateSavingHourly(ch?.powerKw ?? null, avg24h.value, slices)
}
const totalG = computed(() => rows.value.reduce((s, r) => s + rowEstimate(r).savingG, 0))

function addRow(slug?: string) {
  const chosen = slug ?? applianceItems.value[0]?.value
  if (!chosen) return
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
  if (!rows.value.length) return
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
  <div class="space-y-3">
    <!-- One row per run -->
    <div v-for="(row, i) in rows" :key="i" class="flex flex-wrap items-center gap-2">
      <USelectMenu
        v-model="row.slug"
        :items="applianceItems"
        value-key="value"
        placeholder="Appliance"
        size="xs"
        class="w-44"
        @update:model-value="onSlugChange(row)" />
      <span class="text-[11px] text-muted">at</span>
      <USelectMenu
        v-model="row.startMs"
        :items="hourItems"
        value-key="value"
        placeholder="Start hour"
        size="xs"
        class="w-36" />
      <span class="text-[11px] text-muted">for</span>
      <UInputNumber v-model="row.runTimeH" :min="0.25" :step="0.25" size="xs" class="w-20" />
      <span class="text-[11px] text-muted">h</span>
      <span class="text-xs text-success font-medium">≈ {{ fmtG(rowEstimate(row).savingG) }}</span>
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        @click="removeRow(i)" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        v-if="canAddMore"
        size="xs"
        variant="soft"
        color="neutral"
        icon="i-lucide-plus"
        @click="addRow()">
        Add appliance
      </UButton>
      <UButton size="xs" :loading="submitting" :disabled="!rows.length" @click="save">
        Save schedule
      </UButton>
      <UButton size="xs" variant="ghost" color="neutral" @click="emit('cancel')">
        Cancel
      </UButton>
      <span v-if="rows.length > 1" class="text-xs text-success font-semibold">
        Total ≈ {{ fmtG(totalG) }} CO₂
      </span>
    </div>

    <!-- How the estimate is calculated -->
    <div class="rounded-md border border-dashed border-default bg-elevated/30 p-2.5 max-w-lg">
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
    </div>
  </div>
</template>
