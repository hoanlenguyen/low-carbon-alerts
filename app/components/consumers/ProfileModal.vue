<script setup lang="ts">
type ProfileUser = { id: string, userName: string, name: string | null } | null

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user: ProfileUser }>()

interface Profile {
  housingType: string
  householdSize: number
  contractType: string
  primaryHeating: string
  appliances: string[]
  applianceRuntimes: Record<string, number>
  activeHoursStart: string
  activeHoursEnd: string
  energyGoal: string
  notifStyle: string
  maxAlertsPerDay: number
  weeklyEmailOptIn: boolean
  createdAt: string
}

const profile = ref<Profile | null>(null)
const loading = ref(false)
const error = ref('')

async function load() {
  if (!props.user) return
  loading.value = true
  error.value = ''
  profile.value = null
  try {
    const res = await $fetch<{ profile: Profile | null }>(`/api/admin/users/${props.user.id}/profile`)
    profile.value = res.profile
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not load profile'
  } finally {
    loading.value = false
  }
}

watch(open, (o) => { if (o) load() })

const pretty = (v: string) => (v ?? '').replace(/[_-]+/g, ' ').trim()

const rows = computed(() => {
  const p = profile.value
  if (!p) return []
  return [
    { label: 'Housing type', value: pretty(p.housingType) },
    { label: 'Household size', value: String(p.householdSize) },
    { label: 'Electricity contract', value: pretty(p.contractType) },
    { label: 'Primary heating', value: pretty(p.primaryHeating) },
    { label: 'Active hours', value: `${p.activeHoursStart} – ${p.activeHoursEnd}` },
    { label: 'Energy goal', value: pretty(p.energyGoal) },
    { label: 'Notification style', value: pretty(p.notifStyle) },
    { label: 'Max alerts / day', value: String(p.maxAlertsPerDay) },
    { label: 'Weekly email', value: p.weeklyEmailOptIn ? 'On' : 'Off' }
  ]
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Energy profile — ${user?.name || user?.userName || ''}`"
    description="The consumer's onboarding energy profile.">
    <template #body>
      <div v-if="loading" class="py-8 text-center text-sm text-muted">
        Loading…
      </div>

      <UAlert v-else-if="error" color="error" variant="subtle" :title="error" />

      <div v-else-if="!profile" class="py-8 text-center text-sm text-muted">
        This consumer hasn't completed onboarding yet.
      </div>

      <div v-else class="space-y-4">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div v-for="r in rows" :key="r.label" class="min-w-0">
            <dt class="text-[11px] font-medium uppercase tracking-wide text-dimmed">
              {{ r.label }}
            </dt>
            <dd class="text-sm text-highlighted capitalize">
              {{ r.value || '—' }}
            </dd>
          </div>
        </dl>

        <div v-if="profile.appliances.length">
          <p class="text-[11px] font-medium uppercase tracking-wide text-dimmed mb-1.5">
            Appliances
          </p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="a in profile.appliances"
              :key="a"
              color="neutral"
              variant="subtle"
              size="sm"
              class="capitalize">
              {{ a }}<span v-if="profile.applianceRuntimes[a]"> · {{ profile.applianceRuntimes[a] }} min</span>
            </UBadge>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-4">
        <UButton label="Close" color="neutral" variant="subtle" @click="open = false" />
      </div>
    </template>
  </UModal>
</template>
