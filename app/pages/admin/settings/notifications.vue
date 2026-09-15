<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const toast = useToast()
const { user } = useUserSession()

// ── Send test email (verifies Resend delivery end-to-end) ──
const testTo = ref(user.value?.email || '')
const sending = ref(false)

async function sendTestEmail() {
  if (!testTo.value) return
  sending.value = true
  try {
    await $fetch('/api/admin/email-test', { method: 'POST', body: { to: testTo.value } })
    toast.add({ title: 'Test email sent', description: `Sent to ${testTo.value} via Resend.`, color: 'success' })
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to send'
    toast.add({ title: 'Send failed', description: msg, color: 'error' })
  } finally {
    sending.value = false
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

const state = reactive<Record<string, boolean>>({
  email_digest: true,
  push_browser: false,
  alert_low_carbon: true,
  alert_job_failure: true,
  weekly_report: false
})

const sections = [{
  title: 'Delivery channels',
  description: 'How you receive alerts as an admin.',
  fields: [{
    name: 'email_digest',
    label: 'Email digest',
    description: 'Daily summary of sent notifications and unread counts.'
  }, {
    name: 'push_browser',
    label: 'Browser push',
    description: 'Real-time browser notifications when a job fires or fails.'
  }]
}, {
  title: 'Alert triggers',
  description: 'Which events generate an admin alert.',
  fields: [{
    name: 'alert_low_carbon',
    label: 'Low-carbon window detected',
    description: 'Notify when the grid carbon intensity drops below threshold.'
  }, {
    name: 'alert_job_failure',
    label: 'Scheduled job failure',
    description: 'Notify when a cron job fails to deliver to its recipients.'
  }, {
    name: 'weekly_report',
    label: 'Weekly delivery report',
    description: 'Summary of messages sent, open rates, and user growth.'
  }]
}]
</script>

<template>
  <div class="space-y-8">
    <!-- Test email -->
    <div>
      <UPageCard
        title="Test email"
        description="Send a test email to verify Resend delivery is configured correctly."
        variant="naked"
        class="mb-4"
      />
      <UPageCard variant="subtle">
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <UFormField label="Recipient" name="testTo" class="flex-1">
            <UInput v-model="testTo" type="email" placeholder="you@example.com" class="w-full" />
          </UFormField>
          <UButton icon="i-lucide-send" :loading="sending" :disabled="!testTo" @click="sendTestEmail">
            Send test email
          </UButton>
        </div>
      </UPageCard>
    </div>

    <!-- Weekly digest (test) -->
    <div>
      <UPageCard
        title="Weekly digest (test)"
        description="Send the weekly summary email now to selected users (bypasses their opt-in)."
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
            Send weekly digest now
          </UButton>
        </div>
      </UPageCard>
    </div>

    <div v-for="section in sections" :key="section.title">
      <UPageCard
        :title="section.title"
        :description="section.description"
        variant="naked"
        class="mb-4"
      />
      <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
        <UFormField
          v-for="field in section.fields"
          :key="field.name"
          :name="field.name"
          :label="field.label"
          :description="field.description"
          class="flex items-center justify-between not-last:pb-4 gap-4"
        >
          <USwitch v-model="state[field.name]" />
        </UFormField>
      </UPageCard>
    </div>
  </div>
</template>
