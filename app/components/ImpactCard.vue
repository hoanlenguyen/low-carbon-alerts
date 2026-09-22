<script setup lang="ts">
// End-user "Your impact" card — estimated CO2 avoided from self-reported load shifts,
// plus the whole community's running total.
const { impact } = useAchievements()

// Community total across all users (global aggregate). Client-only; shared key so it can
// be refreshed after the user saves a schedule.
const { data: community } = useFetch<{ totalSavingG: number, userCount: number }>('/api/impact/community', {
  key: 'impact-community',
  server: false,
  lazy: true,
  default: () => ({ totalSavingG: 0, userCount: 0 })
})

function fmtG(g: number) {
  return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`
}
function loads(n: number) {
  return `${n} ${n === 1 ? 'load' : 'loads'}`
}

const hasAny = computed(() => (impact.value?.allTime.count ?? 0) > 0)
const stats = computed(() => [
  { label: 'This week', b: impact.value!.week },
  { label: 'This month', b: impact.value!.month },
  { label: 'All time', b: impact.value!.allTime }
])
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-leaf" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Your impact</span>

          <!-- How it's estimated -->
          <UPopover mode="hover">
            <UIcon name="i-lucide-info" class="size-3.5 text-dimmed cursor-help" />
            <template #content>
              <div class="p-3 max-w-xs space-y-2">
                <p class="text-xs font-semibold text-highlighted">How the estimate works</p>
                <div class="rounded-md bg-elevated/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted font-mono">
                  CO₂ saved ≈ power (kW)<br>× Σ hours × (24h-average − carbon at that hour)
                </div>
                <p class="text-[11px] text-muted leading-relaxed">
                  We estimate the carbon avoided by running a flexible appliance in cleaner
                  hours instead of an average one. Each hour of the run is priced with that
                  hour's forecast carbon: the appliance's power times how much lower the
                  grid's intensity is that hour versus the day's 24h average, summed across
                  the run.
                </p>
                <p class="text-[11px] text-dimmed leading-relaxed">
                  It never goes below zero, and it's an estimate from grid data — we don't
                  read your meter.
                </p>
              </div>
            </template>
          </UPopover>
        </div>

        <UBadge
          v-if="(impact?.streakWeeks ?? 0) > 0"
          color="warning"
          variant="subtle"
          size="xs"
          icon="i-lucide-flame"
        >
          {{ impact!.streakWeeks }}-week streak
        </UBadge>
      </div>
    </template>

    <div v-if="!hasAny" class="py-6 text-center">
      <div class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
        <UIcon name="i-lucide-sparkles" class="size-5 text-primary" />
      </div>
      <p class="text-sm font-medium text-highlighted">
        No savings yet — let's change that
      </p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-muted">
        Schedule a flexible load (dishwasher, laundry, EV charging…) into a cleaner hour and we'll estimate the CO₂ you avoid.
      </p>
      <UButton to="/app/schedule" icon="i-lucide-calendar-clock" class="mt-3">
        Plan your first shift
      </UButton>
    </div>

    <div v-else class="grid grid-cols-3 gap-3">
      <div v-for="s in stats" :key="s.label" class="rounded-lg bg-elevated/40 p-3">
        <p class="text-[11px] uppercase tracking-wide text-dimmed">{{ s.label }}</p>
        <p class="text-lg font-semibold text-highlighted tabular-nums mt-0.5">{{ fmtG(s.b.grams) }}</p>
        <p class="text-xs text-muted">{{ loads(s.b.count) }} shifted</p>
      </div>
    </div>

    <!-- Community total across all members -->
    <div
      v-if="(community?.totalSavingG ?? 0) > 0"
      class="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
      <UIcon name="i-lucide-users" class="size-4 text-primary shrink-0" />
      <p class="text-xs text-muted">
        <span class="font-semibold text-highlighted">Community total:</span>
        ≈ {{ fmtG(community!.totalSavingG) }} CO₂ saved by
        {{ community!.userCount }} member{{ community!.userCount === 1 ? '' : 's' }}
      </p>
    </div>

    <template v-if="hasAny" #footer>
      <p class="text-xs text-dimmed">
        Estimated CO₂ avoided by shifting flexible loads into cleaner grid windows.
      </p>
    </template>
  </UPageCard>
</template>
