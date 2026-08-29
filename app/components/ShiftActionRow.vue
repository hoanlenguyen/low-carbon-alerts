<script setup lang="ts">
// "I shifted it" action for one smart-alert message. Renders nothing for messages
// without shift context (non-smart-alert or too old). Shares state via useShiftActions.
const props = defineProps<{ messageId: string }>()

const toast = useToast()
const { infoByMsg, applianceChoices, applianceItems, confirmAction, undoAction, fmtG } = useShiftActions()

const info = computed(() => infoByMsg.value.get(props.messageId))

const picking = ref(false)
const pickSlug = ref('')
const runTimeH = ref(1.5) // hours; user-adjustable, defaults to the appliance's typical run
const submitting = ref(false)

const selectedAppliance = computed(() => applianceChoices.value.find(c => c.slug === pickSlug.value) ?? null)
const defaultRunH = computed(() => (selectedAppliance.value?.durationMin ? selectedAppliance.value.durationMin / 60 : null))
const windowH = computed(() => (info.value?.windowMinutes ? info.value.windowMinutes / 60 : null))
const capped = computed(() => windowH.value != null && runTimeH.value > windowH.value)

function resetRunTime() {
  runTimeH.value = defaultRunH.value ?? 1.5
}
// Reset run time to the appliance default whenever the appliance changes.
watch(pickSlug, resetRunTime)

// Live preview — same shared formula (incl. window cap) the server snapshots on confirm.
const predictedG = computed(() => {
  const i = info.value
  if (!i || !picking.value || !selectedAppliance.value) return null
  return estimateSavingG(selectedAppliance.value.powerKw, Math.round(runTimeH.value * 60), i.avg24h, i.carbonIntensity, i.windowMinutes)
})

function start() {
  const i = info.value
  if (!i) return
  const choices = applianceItems.value
  pickSlug.value = i.suggestedApplianceSlug && choices.some(c => c.value === i.suggestedApplianceSlug)
    ? i.suggestedApplianceSlug
    : (choices[0]?.value ?? '')
  resetRunTime()
  picking.value = true
}

async function confirm() {
  if (!pickSlug.value) return
  submitting.value = true
  try {
    await confirmAction(props.messageId, pickSlug.value, Math.round(runTimeH.value * 60))
    picking.value = false
    toast.add({ title: 'Nice work!', description: 'Your estimated savings were recorded.', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Could not save', color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function undo() {
  try {
    await undoAction(props.messageId)
  } catch {
    toast.add({ title: 'Could not undo', color: 'error' })
  }
}
</script>

<template>
  <div v-if="info" class="mt-2.5" @click.stop>
    <!-- Already confirmed -->
    <div v-if="info.actioned" class="flex items-center gap-2 text-xs">
      <UIcon name="i-lucide-circle-check" class="size-4 text-success shrink-0" />
      <span class="text-success font-medium">
        Shifted · ≈ {{ fmtG(info.estimatedSavingG || 0) }} CO₂ saved
      </span>
      <UButton size="xs" variant="link" color="neutral" class="p-0" @click="undo">
        Undo
      </UButton>
    </div>

    <!-- Confirming: pick appliance + run time -->
    <div v-else-if="picking" class="space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <USelectMenu
          v-model="pickSlug"
          :items="applianceItems"
          value-key="value"
          placeholder="Which appliance?"
          size="xs"
          class="w-52" />
        <UButton size="xs" :loading="submitting" :disabled="!pickSlug" @click="confirm">
          Confirm
        </UButton>
        <UButton size="xs" variant="ghost" color="neutral" @click="picking = false">
          Cancel
        </UButton>
        <span v-if="predictedG !== null" class="text-xs text-success font-medium">
          ≈ {{ fmtG(predictedG) }} CO₂
        </span>
      </div>

      <!-- Run time (default = appliance typical; adjustable) -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted">Ran for</span>
        <UInputNumber v-model="runTimeH" :min="0.25" :step="0.25" size="xs" class="w-24" />
        <span class="text-xs text-muted">hours</span>
        <span v-if="defaultRunH" class="text-[11px] text-dimmed">
          (default {{ defaultRunH }} h)
        </span>
        <span v-if="capped" class="text-[11px] text-warning">
          · capped at the {{ windowH }} h clean window
        </span>
      </div>

      <!-- How the estimate is calculated -->
      <div class="rounded-md border border-dashed border-default bg-elevated/30 p-2.5 max-w-md">
        <p class="text-[11px] font-semibold text-muted">
          How we'll estimate your saving<template v-if="predictedG !== null">: <span class="text-success">≈ {{ fmtG(predictedG) }} CO₂</span></template>
        </p>
        <p class="text-[11px] text-muted font-mono mt-1 leading-relaxed">
          CO₂ saved ≈ power (kW) × run time (h) × (24h-average − window intensity)
        </p>
        <p class="text-[11px] text-dimmed mt-1 leading-relaxed">
          Run time defaults to the appliance's typical value and is capped by the clean
          window's length. It's an estimate from grid data — never below zero.
        </p>
      </div>
    </div>

    <!-- Offer the action (recent, not yet confirmed) -->
    <UButton
      v-else-if="info.actionable"
      size="xs"
      variant="soft"
      icon="i-lucide-hand"
      @click="start">
      I shifted it
    </UButton>
  </div>
</template>
