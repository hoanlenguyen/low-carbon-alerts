<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const toast = useToast()

interface ScheduledJob {
  id: string
  name: string
  subject: string
  body: string
  targetType: 'broadcast' | 'targeted' | 'smartAlert'
  cronExpression: string
  nextRunAt: string | null
  lastRunAt: string | null
  enabled: boolean
}

// Users list for targeted jobs
const { data: users } = await useFetch<{ id: string, userName: string, name: string | null, email: string | null }[]>('/api/admin/users', { lazy: true, query: { active: 1 } })

// Scheduled jobs
const { data: jobs, refresh: refreshJobs } = await useFetch<ScheduledJob[]>('/api/admin/notifications/scheduled', { lazy: true })

const jobSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1),
  body: z.string().min(1),
  targetType: z.enum(['broadcast', 'targeted']),
  targetUserIds: z.array(z.string()).optional(),
  cronExpression: z.string().min(1, 'Cron expression is required')
})
type JobSchema = z.output<typeof jobSchema>

const jobState = reactive<Partial<JobSchema>>({
  name: '',
  subject: '',
  body: '',
  targetType: 'broadcast',
  targetUserIds: [],
  cronExpression: '0 9 * * 1'
})
const jobLoading = ref(false)
const showJobForm = ref(false)

async function onCreateJob(event: FormSubmitEvent<JobSchema>) {
  jobLoading.value = true
  try {
    await $fetch('/api/admin/notifications/scheduled', { method: 'POST', body: event.data })
    toast.add({ title: 'Job scheduled', color: 'success' })
    jobState.name = ''
    jobState.subject = ''
    jobState.body = ''
    jobState.cronExpression = '0 9 * * 1'
    showJobForm.value = false
    await refreshJobs()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Error', color: 'error' })
  } finally {
    jobLoading.value = false
  }
}

async function toggleJob(id: string, enabled: boolean) {
  await $fetch(`/api/admin/notifications/scheduled/${id}`, { method: 'PATCH', body: { enabled } })
  await refreshJobs()
}

async function deleteJob(id: string) {
  await $fetch(`/api/admin/notifications/scheduled/${id}`, { method: 'DELETE' })
  await refreshJobs()
}

function formatRunDate(val: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki'
  })
}
</script>

<template>
  <UDashboardPanel id="scheduled-jobs">
    <template #header>
      <UDashboardNavbar title="Scheduled jobs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            size="sm"
            @click="refreshJobs">
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-5xl mx-auto w-full space-y-6 p-4 sm:p-6">
        <div>
          <p class="text-sm text-muted">
            Recurring notifications dispatched by the cron worker. Each job fires on its cron schedule and sends to its audience.
          </p>
        </div>

        <!-- Header row -->
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-dimmed">
            {{ jobs?.length ?? 0 }} job{{ jobs?.length === 1 ? '' : 's' }}
          </p>
          <UButton size="xs" icon="i-lucide-plus" @click="showJobForm = !showJobForm">
            New job
          </UButton>
        </div>

        <!-- Create form (collapsible) -->
        <div v-if="showJobForm" class="rounded-xl border border-default bg-elevated/40 p-5">
          <p class="text-sm font-semibold mb-4">
            New scheduled job
          </p>
          <UForm
            :schema="jobSchema"
            :state="jobState"
            class="space-y-4"
            @submit="onCreateJob">
            <div class="grid sm:grid-cols-2 gap-4">
              <UFormField label="Job name" name="name">
                <UInput v-model="jobState.name" placeholder="e.g. Morning alert" class="w-full" />
              </UFormField>
              <UFormField label="Cron expression" name="cronExpression">
                <UInput v-model="jobState.cronExpression" placeholder="0 9 * * 1-5" class="w-full font-mono" />
              </UFormField>
            </div>
            <UFormField label="Subject" name="subject">
              <UInput v-model="jobState.subject" class="w-full" />
            </UFormField>
            <UFormField label="Body" name="body">
              <UTextarea v-model="jobState.body" :rows="3" class="w-full" />
            </UFormField>
            <UFormField label="Audience" name="targetType">
              <USelect
                v-model="jobState.targetType"
                :items="[
                  { label: 'All users', value: 'broadcast' },
                  { label: 'Specific users', value: 'targeted' }
                ]"
                class="w-full"
              />
            </UFormField>
            <UFormField v-if="jobState.targetType === 'targeted'" label="Select users" name="targetUserIds">
              <USelectMenu
                v-model="jobState.targetUserIds"
                :items="(users ?? []).map(u => ({ label: u.name ? `${u.userName} · ${u.name}` : u.userName, value: u.id }))"
                value-key="value"
                multiple
                class="w-full"
              />
            </UFormField>
            <div class="flex gap-2">
              <UButton type="submit" icon="i-lucide-clock" :loading="jobLoading">
                Schedule job
              </UButton>
              <UButton color="neutral" variant="ghost" @click="showJobForm = false">
                Cancel
              </UButton>
            </div>
          </UForm>
        </div>

        <!-- Jobs table -->
        <div v-if="jobs?.length" class="rounded-xl border border-default overflow-hidden">
          <table class="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr class="bg-elevated/50">
                <th class="text-left px-4 py-2.5 text-xs font-medium text-dimmed border-b border-default">
                  Job
                </th>
                <th class="text-left px-4 py-2.5 text-xs font-medium text-dimmed border-b border-default hidden sm:table-cell">
                  Schedule
                </th>
                <th class="text-left px-4 py-2.5 text-xs font-medium text-dimmed border-b border-default hidden md:table-cell">
                  Next run
                </th>
                <th class="text-left px-4 py-2.5 text-xs font-medium text-dimmed border-b border-default hidden md:table-cell">
                  Last run
                </th>
                <th class="px-4 py-2.5 border-b border-default w-24 text-right text-xs font-medium text-dimmed">
                  Active
                </th>
                <th class="border-b border-default w-10" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="job in jobs"
                :key="job.id"
                class="group hover:bg-elevated/40 transition-colors"
              >
                <td class="px-4 py-3 border-b border-default">
                  <p class="font-medium text-highlighted text-sm">
                    {{ job.name }}
                  </p>
                  <p class="text-xs text-muted mt-0.5 truncate max-w-xs">
                    {{ job.subject }}
                  </p>
                </td>
                <td class="px-4 py-3 border-b border-default hidden sm:table-cell">
                  <code class="text-xs font-mono text-muted bg-elevated px-2 py-0.5 rounded">{{ job.cronExpression }}</code>
                </td>
                <td class="px-4 py-3 border-b border-default text-xs text-muted tabular-nums hidden md:table-cell">
                  {{ formatRunDate(job.nextRunAt) }}
                </td>
                <td class="px-4 py-3 border-b border-default text-xs text-muted tabular-nums hidden md:table-cell">
                  {{ formatRunDate(job.lastRunAt) }}
                </td>
                <td class="px-4 py-3 border-b border-default text-right">
                  <USwitch :model-value="job.enabled" @update:model-value="toggleJob(job.id, $event)" />
                </td>
                <td class="px-3 py-3 border-b border-default">
                  <UBadge
                    v-if="job.targetType === 'smartAlert'"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    title="System job — driven by the cron worker; toggle to pause instead of deleting">
                    System
                  </UBadge>
                  <UButton
                    v-else
                    icon="i-lucide-trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete job"
                    @click="deleteJob(job.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else-if="!showJobForm" class="text-sm text-muted py-6 text-center border border-dashed border-default rounded-xl">
          No scheduled jobs yet.
        </p>
      </div>
    </template>
  </UDashboardPanel>
</template>
