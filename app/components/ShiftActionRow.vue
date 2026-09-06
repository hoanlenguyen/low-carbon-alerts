<script setup lang="ts">
// Smart-alert message gateway to the Appliance Schedule. Shown only on today's
// smart-alert messages. If the user hasn't scheduled anything today it offers to create
// one (prefilled with this alert's suggested appliance); once today has a schedule it
// shows a "scheduled" tag with the running total and a link to view/edit it. The actual
// picker lives on /app/schedule (shared day schedule, not bound to this message).
const props = defineProps<{ messageId: string }>()

const { hasToday, totalG, suggestionByMsg, fmtG } = useSchedule()

// Only render for today's smart-alert messages (those we have suggestion context for).
const isSmartAlertToday = computed(() => suggestionByMsg.value.has(props.messageId))
const suggestSlug = computed(() => suggestionByMsg.value.get(props.messageId) ?? null)
const createTo = computed(() => (suggestSlug.value ? `/app/schedule?suggest=${suggestSlug.value}` : '/app/schedule'))
</script>

<template>
  <div v-if="isSmartAlertToday" class="mt-2.5" @click.stop>
    <!-- Already scheduled today -->
    <div v-if="hasToday" class="flex flex-wrap items-center gap-2 text-xs">
      <UBadge color="success" variant="subtle" size="xs" icon="i-lucide-circle-check">
        Scheduled today · ≈ {{ fmtG(totalG) }} saved
      </UBadge>
      <UButton size="xs" variant="link" color="neutral" class="p-0" to="/app/schedule">
        View details
      </UButton>
    </div>

    <!-- Nothing scheduled yet -->
    <UButton
      v-else
      size="xs"
      variant="soft"
      icon="i-lucide-hand"
      :to="createTo">
      I shifted it
    </UButton>
  </div>
</template>
