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
  activeTab.value = 'send'
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
const showTemplateForm = ref(false)

async function onCreateTemplate(event: FormSubmitEvent<TemplateSchema>) {
  templateLoading.value = true
  try {
    await $fetch('/api/admin/notifications/templates', { method: 'POST', body: event.data })
    toast.add({ title: 'Template saved', color: 'success' })
    templateState.name = ''
    templateState.subject = ''
    templateState.body = ''
    showTemplateForm.value = false
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

const tabs = [
  { label: 'Send', value: 'send', slot: 'send' as const, icon: 'i-lucide-send' },
  { label: 'Templates', value: 'templates', slot: 'templates' as const, icon: 'i-lucide-file-text' },
  { label: 'Scheduled', value: 'scheduled', slot: 'scheduled' as const, icon: 'i-lucide-clock' }
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
          <div class="pt-5 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <!-- Form -->
            <div class="space-y-5">
              <!-- Template chips -->
              <div v-if="(templates as any[])?.length" class="flex flex-wrap gap-2 items-center">
                <span class="text-xs font-semibold uppercase tracking-wide text-dimmed">Templates:</span>
                <UButton
                  v-for="t in (templates as any[])"
                  :key="t.id"
                  size="xs"
                  color="neutral"
                  variant="outline"
                  @click="applyTemplate(t)"
                >
                  {{ t.name }}
                </UButton>
              </div>

              <UForm
                :schema="sendSchema"
                :state="sendState"
                class="space-y-4"
                @submit="onSend">
                <UFormField label="Subject" name="subject">
                  <UInput v-model="sendState.subject" placeholder="e.g. Low carbon window tonight" class="w-full" />
                </UFormField>

                <UFormField label="Body" name="body">
                  <UTextarea
                    v-model="sendState.body"
                    :rows="4"
                    placeholder="Write your message…"
                    class="w-full" />
                </UFormField>

                <UFormField label="Audience" name="type">
                  <USelect
                    v-model="sendState.type"
                    :items="[
                      { label: 'All users (broadcast)', value: 'broadcast' },
                      { label: 'Specific users', value: 'targeted' }
                    ]"
                    class="w-full"
                  />
                </UFormField>

                <UFormField v-if="sendState.type === 'targeted'" label="Select users" name="targetUserIds">
                  <USelectMenu
                    v-model="sendState.targetUserIds"
                    :items="(users ?? []).map(u => ({ label: u.name || u.email, value: u.id }))"
                    value-key="value"
                    multiple
                    class="w-full"
                  />
                </UFormField>

                <UButton type="submit" icon="i-lucide-send" :loading="sendLoading">
                  Send now
                </UButton>
              </UForm>
            </div>

            <!-- Live preview -->
            <div class="hidden lg:block">
              <p class="text-xs font-semibold uppercase tracking-wide text-dimmed mb-3">
                Preview
              </p>
              <div class="rounded-xl border border-default bg-elevated/40 p-5 space-y-3">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-bell" class="size-4 text-primary shrink-0" />
                  <span class="text-xs font-semibold text-muted uppercase tracking-wide">Push notification</span>
                </div>
                <USeparator />
                <div class="space-y-1.5">
                  <p class="font-semibold text-highlighted text-sm leading-snug">
                    {{ sendState.subject || 'Your subject line will appear here' }}
                  </p>
                  <p class="text-sm text-muted leading-relaxed whitespace-pre-wrap">
                    {{ sendState.body || 'Message body will appear here.' }}
                  </p>
                </div>
                <USeparator />
                <div class="flex items-center justify-between text-xs text-dimmed">
                  <span>{{ sendState.type === 'broadcast' ? 'All users' : `${sendState.targetUserIds?.length ?? 0} user(s)` }}</span>
                  <span>Just now</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Templates ── -->
        <template #templates>
          <div class="pt-5 space-y-6">
            <!-- Header row -->
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
                {{ (templates as any[])?.length ?? 0 }} template{{ (templates as any[])?.length === 1 ? '' : 's' }}
              </p>
              <UButton size="xs" icon="i-lucide-plus" @click="showTemplateForm = !showTemplateForm">
                New template
              </UButton>
            </div>

            <!-- Create form (collapsible) -->
            <div v-if="showTemplateForm" class="rounded-xl border border-default bg-elevated/40 p-5">
              <p class="text-sm font-semibold mb-4">
                New template
              </p>
              <UForm
                :schema="templateSchema"
                :state="templateState"
                class="space-y-4"
                @submit="onCreateTemplate">
                <div class="grid sm:grid-cols-2 gap-4">
                  <UFormField label="Template name" name="name">
                    <UInput v-model="templateState.name" placeholder="e.g. Low carbon alert" class="w-full" />
                  </UFormField>
                  <UFormField label="Subject" name="subject">
                    <UInput v-model="templateState.subject" class="w-full" />
                  </UFormField>
                </div>
                <UFormField label="Body" name="body">
                  <UTextarea v-model="templateState.body" :rows="3" class="w-full" />
                </UFormField>
                <div class="flex gap-2">
                  <UButton type="submit" icon="i-lucide-check" :loading="templateLoading">
                    Save template
                  </UButton>
                  <UButton color="neutral" variant="ghost" @click="showTemplateForm = false">
                    Cancel
                  </UButton>
                </div>
              </UForm>
            </div>

            <!-- Card grid -->
            <div v-if="(templates as any[])?.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="t in (templates as any[])"
                :key="t.id"
                class="group relative rounded-xl border border-default bg-elevated/30 hover:bg-elevated hover:border-primary/40 transition-colors p-4 space-y-2 cursor-pointer"
                @click="applyTemplate(t)"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-semibold text-sm text-highlighted leading-snug">
                    {{ t.name }}
                  </p>
                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-label="Delete template"
                    @click.stop="deleteTemplate(t.id)"
                  />
                </div>
                <p class="text-xs font-medium text-muted truncate">
                  {{ t.subject }}
                </p>
                <p class="text-xs text-dimmed line-clamp-2 leading-relaxed">
                  {{ t.body }}
                </p>
                <div class="pt-1">
                  <span class="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Use in Send →
                  </span>
                </div>
              </div>
            </div>

            <p v-else-if="!showTemplateForm" class="text-sm text-muted py-6 text-center border border-dashed border-default rounded-xl">
              No templates yet. Create one to speed up sending.
            </p>
          </div>
        </template>

        <!-- ── Scheduled ── -->
        <template #scheduled>
          <div class="pt-5 space-y-6">
            <!-- Header row -->
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
                {{ (jobs as any[])?.length ?? 0 }} job{{ (jobs as any[])?.length === 1 ? '' : 's' }}
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
                    :items="(users ?? []).map(u => ({ label: u.name || u.email, value: u.id }))"
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
            <div v-if="(jobs as any[])?.length" class="rounded-xl border border-default overflow-hidden">
              <table class="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr class="bg-elevated/50">
                    <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                      Job
                    </th>
                    <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default hidden sm:table-cell">
                      Schedule
                    </th>
                    <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default hidden md:table-cell">
                      Next run
                    </th>
                    <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default hidden md:table-cell">
                      Last run
                    </th>
                    <th class="px-4 py-2.5 border-b border-default w-24 text-right text-xs font-semibold uppercase tracking-wide text-dimmed">
                      Active
                    </th>
                    <th class="border-b border-default w-10" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="job in (jobs as any[])"
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
                      <UButton
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
      </UTabs>
    </template>
  </UDashboardPanel>
</template>
