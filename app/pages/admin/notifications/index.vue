<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const toast = useToast()
const activeTab = ref('send')

// ── Users list for targeted sends ──
const { data: users } = await useFetch<{ id: string, name: string | null, email: string }[]>('/api/admin/users', { lazy: true })

// ── Templates ──
const { data: templates, refresh: refreshTemplates } = await useFetch('/api/admin/notifications/templates', { lazy: true })

// ── Scheduled jobs ──
const { data: jobs, refresh: refreshJobs } = await useFetch('/api/admin/notifications/scheduled', { lazy: true })

// ── Send form ──
const sendSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['broadcast', 'targeted']),
  targetUserIds: z.array(z.string()).optional()
})
type SendSchema = z.output<typeof sendSchema>

const sendState = reactive<Partial<SendSchema>>({
  subject: '',
  body: '',
  type: 'broadcast',
  targetUserIds: []
})
const sendLoading = ref(false)

function applyTemplate(t: { subject: string, body: string }) {
  sendState.subject = t.subject
  sendState.body = t.body
}

async function onSend(event: FormSubmitEvent<SendSchema>) {
  sendLoading.value = true
  try {
    const res = await $fetch<{ recipients: number }>('/api/admin/notifications/send', {
      method: 'POST',
      body: event.data
    })
    toast.add({ title: 'Sent', description: `Delivered to ${res.recipients} user(s)`, color: 'success' })
    sendState.subject = ''
    sendState.body = ''
  } catch {
    toast.add({ title: 'Error', description: 'Failed to send', color: 'error' })
  } finally {
    sendLoading.value = false
  }
}

// ── Template form ──
const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1),
  body: z.string().min(1)
})
type TemplateSchema = z.output<typeof templateSchema>

const templateState = reactive<Partial<TemplateSchema>>({ name: '', subject: '', body: '' })
const templateLoading = ref(false)

async function onCreateTemplate(event: FormSubmitEvent<TemplateSchema>) {
  templateLoading.value = true
  try {
    await $fetch('/api/admin/notifications/templates', { method: 'POST', body: event.data })
    toast.add({ title: 'Template saved', color: 'success' })
    templateState.name = ''
    templateState.subject = ''
    templateState.body = ''
    await refreshTemplates()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    templateLoading.value = false
  }
}

async function deleteTemplate(id: string) {
  await $fetch(`/api/admin/notifications/templates/${id}`, { method: 'DELETE' })
  await refreshTemplates()
}

// ── Scheduled job form ──
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

async function onCreateJob(event: FormSubmitEvent<JobSchema>) {
  jobLoading.value = true
  try {
    await $fetch('/api/admin/notifications/scheduled', { method: 'POST', body: event.data })
    toast.add({ title: 'Job scheduled', color: 'success' })
    jobState.name = ''
    jobState.subject = ''
    jobState.body = ''
    jobState.cronExpression = '0 9 * * 1'
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

function formatDate(val: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleString()
}

const tabs = [
  { label: 'Send', value: 'send', icon: 'i-lucide-send' },
  { label: 'Templates', value: 'templates', icon: 'i-lucide-file-text' },
  { label: 'Scheduled', value: 'scheduled', icon: 'i-lucide-clock' }
]
</script>

<template>
  <UDashboardPanel id="notifications">
    <template #header>
      <UDashboardNavbar title="Notifications">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <!-- ── Send ── -->
        <template #send>
          <div class="max-w-2xl space-y-6 pt-4">
            <div v-if="templates?.length" class="flex flex-wrap gap-2">
              <span class="text-sm text-muted self-center">Use template:</span>
              <UButton
                v-for="t in templates"
                :key="(t as any).id"
                size="xs"
                color="neutral"
                variant="outline"
                @click="applyTemplate(t as any)"
              >
                {{ (t as any).name }}
              </UButton>
            </div>

            <UForm :schema="sendSchema" :state="sendState" class="space-y-4" @submit="onSend">
              <UFormField label="Subject" name="subject">
                <UInput v-model="sendState.subject" class="w-full" />
              </UFormField>

              <UFormField label="Body" name="body">
                <UTextarea v-model="sendState.body" class="w-full" :rows="4" />
              </UFormField>

              <UFormField label="Target" name="type">
                <USelect
                  v-model="sendState.type"
                  :items="[{ label: 'All users (broadcast)', value: 'broadcast' }, { label: 'Specific users', value: 'targeted' }]"
                  class="w-full"
                />
              </UFormField>

              <UFormField v-if="sendState.type === 'targeted'" label="Select users" name="targetUserIds">
                <USelectMenu
                  v-model="sendState.targetUserIds"
                  :items="(users ?? []).map(u => ({ label: u.name || u.email, value: u.id }))"
                  multiple
                  class="w-full"
                />
              </UFormField>

              <UButton type="submit" icon="i-lucide-send" :loading="sendLoading">
                Send now
              </UButton>
            </UForm>
          </div>
        </template>

        <!-- ── Templates ── -->
        <template #templates>
          <div class="max-w-2xl space-y-6 pt-4">
            <UForm :schema="templateSchema" :state="templateState" class="space-y-4" @submit="onCreateTemplate">
              <div class="grid sm:grid-cols-2 gap-4">
                <UFormField label="Template name" name="name">
                  <UInput v-model="templateState.name" class="w-full" />
                </UFormField>
                <UFormField label="Subject" name="subject">
                  <UInput v-model="templateState.subject" class="w-full" />
                </UFormField>
              </div>
              <UFormField label="Body" name="body">
                <UTextarea v-model="templateState.body" class="w-full" :rows="3" />
              </UFormField>
              <UButton type="submit" icon="i-lucide-plus" :loading="templateLoading">
                Save template
              </UButton>
            </UForm>

            <USeparator />

            <div class="space-y-2">
              <div
                v-for="t in (templates as any[])"
                :key="t.id"
                class="flex items-center justify-between rounded-lg border border-default px-4 py-3"
              >
                <div>
                  <p class="font-medium text-sm">{{ t.name }}</p>
                  <p class="text-xs text-muted">{{ t.subject }}</p>
                </div>
                <UButton icon="i-lucide-trash" color="error" variant="ghost" size="xs" @click="deleteTemplate(t.id)" />
              </div>
              <p v-if="!templates?.length" class="text-sm text-muted">No templates yet.</p>
            </div>
          </div>
        </template>

        <!-- ── Scheduled ── -->
        <template #scheduled>
          <div class="max-w-2xl space-y-6 pt-4">
            <UForm :schema="jobSchema" :state="jobState" class="space-y-4" @submit="onCreateJob">
              <div class="grid sm:grid-cols-2 gap-4">
                <UFormField label="Job name" name="name">
                  <UInput v-model="jobState.name" class="w-full" />
                </UFormField>
                <UFormField label="Cron expression" name="cronExpression">
                  <UInput v-model="jobState.cronExpression" class="w-full" placeholder="0 9 * * 1" />
                </UFormField>
              </div>
              <UFormField label="Subject" name="subject">
                <UInput v-model="jobState.subject" class="w-full" />
              </UFormField>
              <UFormField label="Body" name="body">
                <UTextarea v-model="jobState.body" class="w-full" :rows="3" />
              </UFormField>
              <UFormField label="Target" name="targetType">
                <USelect
                  v-model="jobState.targetType"
                  :items="[{ label: 'All users', value: 'broadcast' }, { label: 'Specific users', value: 'targeted' }]"
                  class="w-full"
                />
              </UFormField>
              <UFormField v-if="jobState.targetType === 'targeted'" label="Select users" name="targetUserIds">
                <USelectMenu
                  v-model="jobState.targetUserIds"
                  :items="(users ?? []).map(u => ({ label: u.name || u.email, value: u.id }))"
                  multiple
                  class="w-full"
                />
              </UFormField>
              <UButton type="submit" icon="i-lucide-clock" :loading="jobLoading">
                Schedule job
              </UButton>
            </UForm>

            <USeparator />

            <div class="space-y-2">
              <div
                v-for="job in (jobs as any[])"
                :key="job.id"
                class="rounded-lg border border-default px-4 py-3 space-y-1"
              >
                <div class="flex items-center justify-between">
                  <p class="font-medium text-sm">{{ job.name }}</p>
                  <div class="flex items-center gap-2">
                    <UToggle :model-value="job.enabled" @update:model-value="toggleJob(job.id, $event)" />
                    <UButton icon="i-lucide-trash" color="error" variant="ghost" size="xs" @click="deleteJob(job.id)" />
                  </div>
                </div>
                <p class="text-xs text-muted font-mono">{{ job.cronExpression }}</p>
                <div class="flex gap-4 text-xs text-muted">
                  <span>Next: {{ formatDate(job.nextRunAt) }}</span>
                  <span>Last: {{ formatDate(job.lastRunAt) }}</span>
                </div>
              </div>
              <p v-if="!jobs?.length" class="text-sm text-muted">No scheduled jobs yet.</p>
            </div>
          </div>
        </template>
      </UTabs>
    </template>
  </UDashboardPanel>
</template>
