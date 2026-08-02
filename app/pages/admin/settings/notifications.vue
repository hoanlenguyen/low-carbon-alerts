<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

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
