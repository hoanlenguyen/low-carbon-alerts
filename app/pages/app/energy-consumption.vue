<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const toast = useToast()

const { data: saved, status } = useFetch('/api/user/profile', { server: false })

// The page shows all profile details read-only; Edit reveals the full form at once.
const editing = ref(false)

// ── Step 1 ──
const housingType = ref('')
const householdSize = ref(2)
const contractType = ref('')
const primaryHeating = ref('')

// ── Step 2 ──
const selectedAppliances = ref<string[]>([])
const activeHoursStart = ref('07:00')
const activeHoursEnd = ref('22:00')
const applianceRuntimeH = reactive<Record<string, number>>({}) // appliance name → hours

// ── Step 3 ──
const energyGoal = ref('')
const notifStyle = ref<'detailed' | 'simple'>('detailed')
const maxAlertsPerDay = ref(1)

function hydrateRuntimes(names: string[], runtimes: Record<string, number> | undefined) {
  for (const k of Object.keys(applianceRuntimeH)) delete applianceRuntimeH[k]
  for (const n of names) applianceRuntimeH[n] = runtimes?.[n] ? Math.round((runtimes[n] / 60) * 4) / 4 : 1.5
}
function buildRuntimesMin() {
  return Object.fromEntries(selectedAppliances.value.map(n => [n, Math.round((applianceRuntimeH[n] ?? 1.5) * 60)]))
}

// Pre-fill when data loads
watch(saved, (p) => {
  if (!p) return
  housingType.value = p.housingType
  householdSize.value = p.householdSize
  contractType.value = p.contractType
  primaryHeating.value = p.primaryHeating
  selectedAppliances.value = p.appliances
  activeHoursStart.value = p.activeHoursStart
  activeHoursEnd.value = p.activeHoursEnd
  energyGoal.value = p.energyGoal
  notifStyle.value = p.notifStyle as 'detailed' | 'simple'
  maxAlertsPerDay.value = p.maxAlertsPerDay ?? 1
  hydrateRuntimes(p.appliances, p.applianceRuntimes)
}, { immediate: true })

// ── Options ──
const housingOptions = [
  { value: 'apartment', label: 'Apartment', icon: 'i-lucide-building-2' },
  { value: 'row_house', label: 'Row house', icon: 'i-lucide-home' },
  { value: 'house', label: 'House', icon: 'i-lucide-house' },
  { value: 'other', label: 'Other', icon: 'i-lucide-building' }
]
const contractOptions = [
  { value: 'spot', label: 'Spot price' },
  { value: 'fixed', label: 'Fixed price' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'unknown', label: 'Don\'t know' }
]
const heatingOptions = [
  { value: 'electric', label: 'Electric', icon: 'i-lucide-zap' },
  { value: 'heat_pump', label: 'Heat pump', icon: 'i-lucide-wind' },
  { value: 'district', label: 'District', icon: 'i-lucide-building-2' },
  { value: 'wood', label: 'Wood/biomass', icon: 'i-lucide-flame' },
  { value: 'other', label: 'Other', icon: 'i-lucide-circle-ellipsis' }
]
const applianceOptions = [
  'Washing machine', 'Dishwasher', 'EV charger', 'Electric oven',
  'Sauna', 'Tumble dryer', 'Hot tub', 'Heat pump'
]
const goalOptions = [
  { value: 'reduce_carbon', label: 'Reduce carbon', desc: 'Use electricity when it\'s cleanest', icon: 'i-lucide-leaf' },
  { value: 'save_bills', label: 'Save on bills', desc: 'Shift loads to cheaper hours', icon: 'i-lucide-piggy-bank' },
  { value: 'understand_usage', label: 'Understand usage', desc: 'Learn my electricity footprint', icon: 'i-lucide-bar-chart-2' },
  { value: 'all', label: 'All of the above', desc: 'Optimise across every dimension', icon: 'i-lucide-sparkles' }
]

// ── Toggle helpers ──
function toggleAppliance(item: string) {
  const i = selectedAppliances.value.indexOf(item)
  if (i >= 0) {
    selectedAppliances.value.splice(i, 1)
  } else {
    selectedAppliances.value.push(item)
    if (applianceRuntimeH[item] == null) applianceRuntimeH[item] = 1.5
  }
}

// ── Validation ──
const step1Valid = computed(() => !!housingType.value && !!contractType.value && !!primaryHeating.value)
const step2Valid = computed(() => selectedAppliances.value.length > 0)
const step3Valid = computed(() => !!energyGoal.value)
const allValid = computed(() => step1Valid.value && step2Valid.value && step3Valid.value)

// ── Read-only label helpers ──
function labelOf(options: { value: string, label: string }[], value: string) {
  return options.find(o => o.value === value)?.label ?? '—'
}
const notifStyleLabel = computed(() => (notifStyle.value === 'detailed' ? 'Data-rich' : 'Simple & plain'))

function syncFromSaved() {
  const p = saved.value
  if (!p) return
  housingType.value = p.housingType
  householdSize.value = p.householdSize
  contractType.value = p.contractType
  primaryHeating.value = p.primaryHeating
  selectedAppliances.value = [...p.appliances]
  activeHoursStart.value = p.activeHoursStart
  activeHoursEnd.value = p.activeHoursEnd
  energyGoal.value = p.energyGoal
  notifStyle.value = p.notifStyle as 'detailed' | 'simple'
  maxAlertsPerDay.value = p.maxAlertsPerDay ?? 1
  hydrateRuntimes(p.appliances, p.applianceRuntimes)
}

function cancelEdit() {
  syncFromSaved() // discard unsaved changes
  editing.value = false
}

// ── Save ──
const saving = ref(false)

async function save() {
  if (!allValid.value) return
  saving.value = true
  try {
    await $fetch('/api/auth/onboarding', {
      method: 'POST',
      body: {
        housingType: housingType.value,
        householdSize: householdSize.value,
        contractType: contractType.value,
        primaryHeating: primaryHeating.value,
        appliances: selectedAppliances.value,
        applianceRuntimes: buildRuntimesMin(),
        activeHoursStart: activeHoursStart.value,
        activeHoursEnd: activeHoursEnd.value,
        energyGoal: energyGoal.value,
        notifStyle: notifStyle.value,
        maxAlertsPerDay: maxAlertsPerDay.value
      }
    })
    await refreshNuxtData()
    editing.value = false
    toast.add({ title: 'Profile saved', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-highlighted">
        Energy Consumption
      </h1>
      <p class="text-sm text-muted mt-0.5">
        Your household profile used to personalise carbon recommendations.
      </p>
    </div>

    <div v-if="status === 'pending'" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-6 text-muted animate-spin" />
    </div>

    <template v-else>
      <!-- Your impact — estimated CO₂ saved this week / month / all time -->
      <ImpactCard />

      <!-- Achievements — milestone badges derived from your shift impact -->
      <AchievementsCard />

      <!-- Energy Consumption detail -->
      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-3 w-full">
            <div>
              <p class="font-semibold text-sm text-highlighted">
                Energy Consumption detail
              </p>
              <p class="text-xs text-muted mt-0.5">
                Everything we use to personalise your carbon alerts.
              </p>
            </div>
            <UButton
              v-if="!editing"
              size="sm"
              variant="soft"
              icon="i-lucide-pencil"
              @click="editing = true">
              Edit
            </UButton>
          </div>
        </template>

        <!-- Read-only summary: all details at once -->
        <dl v-if="!editing" class="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Housing type
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ labelOf(housingOptions, housingType) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Household size
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ householdSize }} {{ householdSize === 1 ? 'person' : 'people' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Electricity contract
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ labelOf(contractOptions, contractType) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Primary heating
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ labelOf(heatingOptions, primaryHeating) }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Appliances
            </dt>
            <dd class="flex flex-wrap gap-1.5 mt-1.5">
              <UBadge
                v-for="a in selectedAppliances"
                :key="a"
                color="neutral"
                variant="subtle">
                {{ a }}
              </UBadge>
              <span v-if="!selectedAppliances.length" class="text-sm text-muted">—</span>
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Active hours
            </dt>
            <dd class="text-sm text-highlighted mt-0.5 font-mono">
              {{ activeHoursStart }} – {{ activeHoursEnd }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Max alerts per day
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ maxAlertsPerDay }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Primary goal
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ labelOf(goalOptions, energyGoal) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-dimmed">
              Notification style
            </dt>
            <dd class="text-sm text-highlighted mt-0.5">
              {{ notifStyleLabel }}
            </dd>
          </div>
        </dl>

        <!-- Edit: all sections stacked (no stepper) -->
        <div v-else class="flex flex-col gap-8">
          <!-- Your Home -->
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-base font-semibold text-highlighted">
                Your home
              </p>
              <p class="text-sm text-muted mt-0.5">
                Helps us tailor recommendations to your setup
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Housing type
              </p>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="opt in housingOptions"
                  :key="opt.value"
                  type="button"
                  class="flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-center transition cursor-pointer"
                  :class="housingType === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-default text-muted hover:border-muted'"
                  @click="housingType = opt.value"
                >
                  <UIcon :name="opt.icon" class="size-5" />
                  <span class="text-[11px] leading-tight">{{ opt.label }}</span>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Household size
              </p>
              <div class="flex items-center gap-3 w-fit bg-elevated rounded-lg border border-default px-4 py-2">
                <button
                  type="button"
                  class="size-7 rounded-full border border-default flex items-center justify-center text-muted hover:text-highlighted transition cursor-pointer"
                  @click="householdSize = Math.max(1, householdSize - 1)"
                >
                  <UIcon name="i-lucide-minus" class="size-3.5" />
                </button>
                <span class="text-xl font-bold text-highlighted w-5 text-center">{{ householdSize }}</span>
                <button
                  type="button"
                  class="size-7 rounded-full border border-default flex items-center justify-center text-muted hover:text-highlighted transition cursor-pointer"
                  @click="householdSize = Math.min(10, householdSize + 1)"
                >
                  <UIcon name="i-lucide-plus" class="size-3.5" />
                </button>
                <span class="text-xs text-muted ml-1">people</span>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Electricity contract
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in contractOptions"
                  :key="opt.value"
                  type="button"
                  class="rounded-full border px-3.5 py-1.5 text-xs transition cursor-pointer"
                  :class="contractType === opt.value
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-default text-muted hover:border-muted'"
                  @click="contractType = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Primary heating
              </p>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="opt in heatingOptions"
                  :key="opt.value"
                  type="button"
                  class="flex flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-center transition cursor-pointer"
                  :class="primaryHeating === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-default text-muted hover:border-muted'"
                  @click="primaryHeating = opt.value"
                >
                  <UIcon :name="opt.icon" class="size-4" />
                  <span class="text-[10px] leading-tight">{{ opt.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Your Habits -->
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-base font-semibold text-highlighted">
                Your habits & appliances
              </p>
              <p class="text-sm text-muted mt-0.5">
                We use this to find flexible loads and ideal alert windows
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Appliances you have
                <span class="normal-case font-normal tracking-normal ml-1">(select all that apply)</span>
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="item in applianceOptions"
                  :key="item"
                  type="button"
                  class="rounded-full border px-3.5 py-1.5 text-xs transition cursor-pointer"
                  :class="selectedAppliances.includes(item)
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-default text-muted hover:border-muted'"
                  @click="toggleAppliance(item)"
                >
                  {{ item }}
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Active hours at home
              </p>
              <div class="flex items-center gap-3">
                <input
                  v-model="activeHoursStart"
                  type="time"
                  class="bg-elevated border border-default rounded-lg px-3 py-2 text-sm font-mono font-semibold text-highlighted focus:outline-none focus:border-primary"
                >
                <span class="text-xs text-muted">to</span>
                <input
                  v-model="activeHoursEnd"
                  type="time"
                  class="bg-elevated border border-default rounded-lg px-3 py-2 text-sm font-mono font-semibold text-highlighted focus:outline-none focus:border-primary"
                >
              </div>
              <p class="text-xs text-muted">
                When you're usually home and using electricity
              </p>
            </div>

            <div v-if="selectedAppliances.length" class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Typical run time
                <span class="normal-case font-normal tracking-normal ml-1">(hours, per appliance)</span>
              </p>
              <div class="flex flex-col gap-2">
                <div v-for="name in selectedAppliances" :key="name" class="flex items-center justify-between gap-3">
                  <span class="text-sm text-muted">{{ name }}</span>
                  <UInputNumber
                    v-model="applianceRuntimeH[name]"
                    :min="0.25"
                    :step="0.25"
                    size="xs"
                    class="w-24" />
                </div>
              </div>
              <p class="text-xs text-muted">
                Used to estimate the CO₂ you save when you shift a load.
              </p>
            </div>
          </div>

          <!-- Your Goals -->
          <div class="flex flex-col gap-5">
            <div>
              <p class="text-base font-semibold text-highlighted">
                What do you want to achieve?
              </p>
              <p class="text-sm text-muted mt-0.5">
                Shapes the tone and focus of your recommendations
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Primary goal
              </p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="opt in goalOptions"
                  :key="opt.value"
                  type="button"
                  class="rounded-lg border p-3 text-left transition cursor-pointer"
                  :class="energyGoal === opt.value
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-default hover:border-muted'"
                  @click="energyGoal = opt.value"
                >
                  <UIcon :name="opt.icon" class="size-4 mb-1.5" :class="energyGoal === opt.value ? 'text-green-400' : 'text-muted'" />
                  <p class="text-xs font-semibold text-highlighted">
                    {{ opt.label }}
                  </p>
                  <p class="text-[11px] text-muted leading-snug mt-0.5">
                    {{ opt.desc }}
                  </p>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Notification style
              </p>
              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  class="rounded-lg border px-3 py-2.5 text-left transition cursor-pointer"
                  :class="notifStyle === 'detailed' ? 'border-primary bg-primary/10' : 'border-default hover:border-muted'"
                  @click="notifStyle = 'detailed'"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div class="size-2 rounded-full border" :class="notifStyle === 'detailed' ? 'bg-primary border-primary' : 'border-muted'" />
                    <span class="text-xs font-semibold text-highlighted">Data-rich</span>
                  </div>
                  <p class="text-[11px] text-muted italic pl-4">
                    "Next 24h avg: 23 gCO₂/kWh. Run dishwasher before 14:00."
                  </p>
                </button>
                <button
                  type="button"
                  class="rounded-lg border px-3 py-2.5 text-left transition cursor-pointer"
                  :class="notifStyle === 'simple' ? 'border-primary bg-primary/10' : 'border-default hover:border-muted'"
                  @click="notifStyle = 'simple'"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div class="size-2 rounded-full border" :class="notifStyle === 'simple' ? 'bg-primary border-primary' : 'border-muted'" />
                    <span class="text-xs font-semibold text-highlighted">Simple & plain</span>
                  </div>
                  <p class="text-[11px] text-muted italic pl-4">
                    "Electricity is clean this afternoon — good time for a load."
                  </p>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Max alerts per day
              </p>
              <div class="flex items-center gap-3 w-fit bg-elevated rounded-lg border border-default px-4 py-2">
                <button
                  type="button"
                  class="size-7 rounded-full border border-default flex items-center justify-center text-muted hover:text-default transition cursor-pointer"
                  @click="maxAlertsPerDay = Math.max(1, maxAlertsPerDay - 1)"
                >
                  <UIcon name="i-lucide-minus" class="size-3.5" />
                </button>
                <span class="text-xl font-bold text-highlighted w-5 text-center">{{ maxAlertsPerDay }}</span>
                <button
                  type="button"
                  class="size-7 rounded-full border border-default flex items-center justify-center text-muted hover:text-default transition cursor-pointer"
                  @click="maxAlertsPerDay = Math.min(10, maxAlertsPerDay + 1)"
                >
                  <UIcon name="i-lucide-plus" class="size-3.5" />
                </button>
                <span class="text-xs text-muted ml-1">per day</span>
              </div>
              <p class="text-xs text-muted">
                We'll never send more smart alerts than this in a day.
              </p>
            </div>
          </div>

          <!-- Save / cancel -->
          <div class="flex items-center justify-end gap-2 pt-4 border-t border-default">
            <UButton
              variant="ghost"
              color="neutral"
              :disabled="saving"
              @click="cancelEdit">
              Cancel
            </UButton>
            <UButton
              color="primary"
              icon="i-lucide-check"
              :loading="saving"
              :disabled="!allValid"
              @click="save"
            >
              Save changes
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
