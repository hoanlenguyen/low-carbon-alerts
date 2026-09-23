<script setup lang="ts">
type RunsUser = { id: string, userName: string, name: string | null } | null

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user: RunsUser }>()

interface Run {
  id: string
  day: string
  applianceSlug: string
  name: string
  icon: string
  startAtMs: number
  runTimeMin: number
  carbonAtStart: number | null
  avg24h: number | null
  estimatedSavingG: number
}

const runs = ref<Run[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  if (!props.user) return
  loading.value = true
  error.value = ''
  runs.value = []
  try {
    runs.value = await $fetch<Run[]>(`/api/admin/users/${props.user.id}/shifts`)
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not load runs'
  } finally {
    loading.value = false
  }
}
watch(open, (o) => { if (o) load() })

const fmtG = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${Math.round(g)} g`)
const fmtCarbon = (n: number | null) => (n == null ? '—' : String(Number(n.toFixed(2))))
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki'
})
const fmtH = (min: number) => (min / 60).toFixed(2).replace(/\.?0+$/, '')
const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Helsinki'
})

// Group runs by day (already ordered newest day first, runs ascending by start).
const groups = computed(() => {
  const map = new Map<string, Run[]>()
  for (const r of runs.value) {
    const list = map.get(r.day) ?? []
    list.push(r)
    map.set(r.day, list)
  }
  return [...map.entries()].map(([day, items]) => ({
    day,
    items,
    totalG: items.reduce((s, r) => s + r.estimatedSavingG, 0)
  }))
})
const totalG = computed(() => runs.value.reduce((s, r) => s + r.estimatedSavingG, 0))
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Appliance runs — ${user?.name || user?.userName || ''}`"
    :description="runs.length ? `${runs.length} run${runs.length === 1 ? '' : 's'} · ≈ ${fmtG(totalG)} CO₂ saved` : 'Logged appliance shifts and estimated CO₂ saved.'"
  >
    <template #body>
      <div v-if="loading" class="py-8 text-center text-sm text-muted">
        Loading…
      </div>

      <UAlert v-else-if="error" color="error" variant="subtle" :title="error" />

      <div v-else-if="!runs.length" class="py-8 text-center text-sm text-muted">
        No appliance runs logged yet.
      </div>

      <!-- Single scroll area (the modal body); sticky day headers keep context on long lists -->
      <div v-else class="-mx-4 sm:-mx-6 -my-2 divide-y divide-default">
        <div v-for="g in groups" :key="g.day">
          <div class="sticky top-0 z-10 flex items-center justify-between gap-3 bg-default/95 px-4 sm:px-6 py-1.5 backdrop-blur">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-dimmed">
              {{ dayLabel(g.day) }}
            </span>
            <span class="text-xs font-medium text-success tabular-nums">≈ {{ fmtG(g.totalG) }}</span>
          </div>
          <div
            v-for="r in g.items"
            :key="r.id"
            class="flex items-center gap-3 px-4 sm:px-6 py-2 hover:bg-elevated/40 transition-colors"
          >
            <UIcon :name="r.icon" class="size-4 shrink-0 text-primary" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-highlighted truncate">
                {{ r.name }}
              </p>
              <p class="text-xs text-muted tabular-nums">
                {{ hhmm(r.startAtMs) }} · {{ fmtH(r.runTimeMin) }} h · {{ fmtCarbon(r.carbonAtStart) }} gCO₂/kWh
              </p>
            </div>
            <span class="shrink-0 text-sm font-semibold text-success tabular-nums">
              ≈ {{ fmtG(r.estimatedSavingG) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template v-if="!loading && runs.length" #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <span class="text-xs text-muted tabular-nums">
          {{ runs.length }} run{{ runs.length === 1 ? '' : 's' }} · ≈ {{ fmtG(totalG) }} CO₂
        </span>
        <UButton label="Close" color="neutral" variant="subtle" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
