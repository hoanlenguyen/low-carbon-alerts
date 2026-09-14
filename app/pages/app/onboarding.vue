<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const router = useRouter()
const toast = useToast()
const { fetch: refreshSession } = useUserSession()

// ── Stepper ──
const stepperRef = useTemplateRef('stepper')
const currentStep = ref(0)

const steps = [
  { title: 'Your Home', description: 'Household profile' },
  { title: 'Your Habits', description: 'Appliances & schedule' },
  { title: 'Your Goals', description: 'Targets & alerts' },
  { title: 'Notifications', description: 'Install & enable' }
]

const LAST_STEP = steps.length - 1

// ── Step 1 state ──
const housingType = ref<string>('')
const householdSize = ref(2)
const contractType = ref<string>('')
const primaryHeating = ref<string>('')

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

// ── Step 2 state ──
// Appliance catalog comes from the admin-managed table (active rows only).
type ApplianceOption = { slug: string, name: string, icon: string, category: string, description: string | null }
const { data: applianceOptions } = await useFetch<ApplianceOption[]>('/api/appliances', {
  default: () => [] as ApplianceOption[]
})
const selectedAppliances = ref<string[]>([])
const applianceRuntimeH = reactive<Record<string, number>>({}) // appliance name → hours

const activeHoursStart = ref('07:00')
const activeHoursEnd = ref('22:00')

function buildRuntimesMin() {
  return Object.fromEntries(selectedAppliances.value.map(n => [n, Math.round((applianceRuntimeH[n] ?? 1.5) * 60)]))
}

// ── Step 3 state ──
const goalOptions = [
  { value: 'reduce_carbon', label: 'Reduce carbon', desc: 'Use electricity when it\'s cleanest', icon: 'i-lucide-leaf' },
  { value: 'save_bills', label: 'Save on bills', desc: 'Shift loads to cheaper hours', icon: 'i-lucide-piggy-bank' },
  { value: 'understand_usage', label: 'Understand usage', desc: 'Learn my electricity footprint', icon: 'i-lucide-bar-chart-2' },
  { value: 'all', label: 'All of the above', desc: 'Optimise across every dimension', icon: 'i-lucide-sparkles' }
]
const energyGoal = ref<string>('')

const notifStyle = ref<'detailed' | 'simple'>('detailed')
const maxAlertsPerDay = ref(1)

// ── Validation ──
const step1Valid = computed(() =>
  !!housingType.value && !!contractType.value && !!primaryHeating.value
)
const step2Valid = computed(() =>
  selectedAppliances.value.length > 0
)
const step3Valid = computed(() =>
  !!energyGoal.value
)

function canContinue() {
  if (currentStep.value === 0) return step1Valid.value
  if (currentStep.value === 1) return step2Valid.value
  if (currentStep.value === 2) return step3Valid.value
  return true
}

function goNext() {
  if (!canContinue()) return
  stepperRef.value?.next()
}

function goBack() {
  stepperRef.value?.prev()
}

// ── Toggle helpers ──
function toggleAppliance(item: string) {
  const i = selectedAppliances.value.indexOf(item)
  if (i >= 0) selectedAppliances.value.splice(i, 1)
  else {
    selectedAppliances.value.push(item)
    if (applianceRuntimeH[item] == null) applianceRuntimeH[item] = 1.5
  }
}

// ── Submit ──
const submitting = ref(false)

async function finish() {
  if (!step3Valid.value) return
  submitting.value = true
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
    await refreshSession()
    toast.add({ title: 'Setup complete!', description: 'Your profile is saved. Welcome aboard.', color: 'success' })
    router.push('/app')
  } catch {
    toast.add({ title: 'Something went wrong', description: 'Please try again.', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-lg">
    <!-- UStepper -->
    <UStepper
      ref="stepper"
      v-model="currentStep"
      :items="steps"
      class="mb-8"
    />

    <!-- Card -->
    <UCard>
      <!-- Step 1: Your Home -->
      <div v-if="currentStep === 0" class="flex flex-col gap-5">
        <div>
          <p class="text-base font-semibold text-highlighted">
            Tell us about your home
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
                : 'border-default text-muted hover:border-default/80'"
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
              class="size-7 rounded-full border border-default flex items-center justify-center text-muted hover:text-default transition cursor-pointer"
              @click="householdSize = Math.max(1, householdSize - 1)"
            >
              <UIcon name="i-lucide-minus" class="size-3.5" />
            </button>
            <span class="text-xl font-bold text-highlighted w-5 text-center">{{ householdSize }}</span>
            <button
              type="button"
              class="size-7 rounded-full border border-default flex items-center justify-center text-muted hover:text-default transition cursor-pointer"
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
                : 'border-default text-muted hover:border-default/80'"
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
                : 'border-default text-muted hover:border-default/80'"
              @click="primaryHeating = opt.value"
            >
              <UIcon :name="opt.icon" class="size-4" />
              <span class="text-[10px] leading-tight">{{ opt.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: Your Habits -->
      <div v-else-if="currentStep === 1" class="flex flex-col gap-5">
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
              :key="item.slug"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition cursor-pointer"
              :class="selectedAppliances.includes(item.name)
                ? 'border-primary text-primary bg-primary/10'
                : 'border-default text-muted hover:border-default/80'"
              @click="toggleAppliance(item.name)"
            >
              <UIcon :name="item.icon" class="size-3.5 shrink-0" />
              {{ item.name }}
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
              <UInputNumber v-model="applianceRuntimeH[name]" :min="0.25" :step="0.25" size="xs" class="w-24" />
            </div>
          </div>
          <p class="text-xs text-muted">
            Used to estimate the CO₂ you save when you shift a load.
          </p>
        </div>
      </div>

      <!-- Step 3: Your Goals -->
      <div v-else-if="currentStep === 2" class="flex flex-col gap-5">
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
                : 'border-default hover:border-default/80'"
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
              :class="notifStyle === 'detailed' ? 'border-primary bg-primary/10' : 'border-default hover:border-default/80'"
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
              :class="notifStyle === 'simple' ? 'border-primary bg-primary/10' : 'border-default hover:border-default/80'"
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

      <!-- Step 4: Notifications & install -->
      <div v-else class="flex flex-col gap-5">
        <div>
          <p class="text-base font-semibold text-highlighted">
            Get your alerts on this device
          </p>
          <p class="text-sm text-muted mt-0.5">
            Turn on notifications so we can reach you at the cleanest times — and add the app to your Home Screen for one-tap access.
          </p>
        </div>

        <NotificationTip persist-install />

        <p class="text-xs text-dimmed">
          You can change this anytime in
          <NuxtLink to="/app/settings" class="text-primary hover:underline">Settings → Push notifications</NuxtLink>.
          It's optional — you can finish setup either way.
        </p>
      </div>

      <!-- Footer nav -->
      <template #footer>
        <div class="flex items-center justify-between">
          <UButton
            v-if="currentStep > 0"
            variant="ghost"
            color="neutral"
            leading-icon="i-lucide-arrow-left"
            @click="goBack"
          >
            Back
          </UButton>
          <div v-else />

          <UButton
            v-if="currentStep < LAST_STEP"
            color="primary"
            trailing-icon="i-lucide-arrow-right"
            :disabled="!canContinue()"
            @click="goNext"
          >
            Continue
          </UButton>
          <UButton
            v-else
            color="success"
            leading-icon="i-lucide-check"
            :loading="submitting"
            :disabled="!step3Valid"
            @click="finish"
          >
            Finish setup
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
