<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const toast = useToast()

// ── Weekly report master switch (drives the scheduled 'weekly-digest' job) ──
type Job = { id: string, targetType: string, enabled: boolean }
const { data: jobs } = await useFetch<Job[]>('/api/admin/notifications/scheduled', { default: () => [] })
const weeklyJob = computed(() =>
  (jobs.value ?? []).find(j => j.id === 'weekly-digest' || j.targetType === 'weeklyDigest')
)
const weeklyEnabled = ref(false)
watch(weeklyJob, (j) => { if (j) weeklyEnabled.value = j.enabled }, { immediate: true })
const savingToggle = ref(false)

async function onToggleWeekly(value: boolean) {
  const id = weeklyJob.value?.id
  if (!id) return
  savingToggle.value = true
  try {
    await $fetch(`/api/admin/notifications/scheduled/${id}`, { method: 'PATCH', body: { enabled: value } })
    weeklyEnabled.value = value
    toast.add({ title: value ? 'Weekly report enabled' : 'Weekly report disabled', color: value ? 'success' : 'neutral' })
  } catch (e: unknown) {
    weeklyEnabled.value = !value // revert on failure
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to update'
    toast.add({ title: 'Could not update', description: msg, color: 'error' })
  } finally {
    savingToggle.value = false
  }
}

// ── Send weekly digest now (test, to selected users) ──
type AdminUser = { id: string, userName: string, name: string | null, email: string }
const { data: users } = await useFetch<AdminUser[]>('/api/admin/users', {
  query: { active: 1 },
  default: () => []
})
const userItems = computed(() =>
  (users.value ?? [])
    .filter(u => !!u.email)
    .map(u => ({ label: u.name ? `${u.name} · ${u.email}` : u.email, value: u.id }))
)
const selectedUserIds = ref<string[]>([])
const sendingDigest = ref(false)

async function sendWeeklyDigest() {
  if (!selectedUserIds.value.length) return
  sendingDigest.value = true
  try {
    const res = await $fetch<{ sent: number, failed: number, recipients: number }>('/api/admin/weekly-digest-test', {
      method: 'POST',
      body: { userIds: selectedUserIds.value }
    })
    toast.add({
      title: 'Weekly digest sent',
      description: `Sent ${res.sent}/${res.recipients}${res.failed ? `, ${res.failed} failed` : ''}.`,
      color: res.failed ? 'warning' : 'success'
    })
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to send'
    toast.add({ title: 'Send failed', description: msg, color: 'error' })
  } finally {
    sendingDigest.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Weekly report (master switch) -->
    <div>
      <UPageCard
        title="Weekly report"
        description="A weekly summary email sent to opted-in users every Monday morning."
        variant="naked"
        class="mb-4"
      />
      <UPageCard variant="subtle">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="size-4 shrink-0" :class="weeklyEnabled ? 'text-primary' : 'text-dimmed'" />
              <span class="text-sm font-medium text-highlighted">Send the weekly report</span>
              <UBadge
                :label="weeklyEnabled ? 'On' : 'Off'"
                :color="weeklyEnabled ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
              />
            </div>
            <p class="text-xs text-muted">
              When on, the scheduled job emails the weekly digest to opted-in users every Monday at 08:00 (Helsinki time).
            </p>
            <p v-if="!weeklyJob" class="text-xs text-warning">
              The weekly-report job isn't set up yet — run the database migrations.
            </p>
          </div>
          <USwitch
            :model-value="weeklyEnabled"
            :disabled="!weeklyJob || savingToggle"
            @update:model-value="onToggleWeekly"
          />
        </div>
      </UPageCard>
    </div>

    <!-- Send weekly report now (test) -->
    <div>
      <UPageCard
        title="Send now (test)"
        description="Send the weekly report immediately to selected users (bypasses their opt-in)."
        variant="naked"
        class="mb-4"
      />
      <UPageCard variant="subtle">
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <UFormField label="Recipients" name="digestUsers" class="flex-1">
            <USelectMenu
              v-model="selectedUserIds"
              :items="userItems"
              value-key="value"
              multiple
              placeholder="Select users (with email)"
              class="w-full"
            />
          </UFormField>
          <UButton
            icon="i-lucide-mail-check"
            :loading="sendingDigest"
            :disabled="!selectedUserIds.length"
            @click="sendWeeklyDigest"
          >
            Send weekly report now
          </UButton>
        </div>
      </UPageCard>
    </div>
  </div>
</template>
