<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const toast = useToast()

// ── Users list for targeted sends ──
const { data: users } = await useFetch<{ id: string, name: string | null, email: string }[]>('/api/admin/users', { lazy: true })

// ── Templates ──
const { data: templates, refresh: refreshTemplates } = await useFetch('/api/admin/notifications/templates', { lazy: true })

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
const generatingAlert = ref(false)

// Build a Prompt 7 smart-alert message from the live forecast and drop it into
// the Send form for review + targeted delivery (prompts/07_push_notification_message.md).
async function generateSmartAlert() {
  generatingAlert.value = true
  try {
    const res = await $fetch<{ subject: string, body: string }>(
      '/api/admin/notifications/smart-alert-preview',
      { method: 'POST' }
    )
    sendState.subject = res.subject
    sendState.body = res.body
    sendState.type = 'targeted'
    toast.add({ title: 'Smart alert generated', description: 'Pick the users to test with, then send.', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Could not generate a message', color: 'error' })
  } finally {
    generatingAlert.value = false
  }
}

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

// ── Templates (add / edit via modal) ──
const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1),
  body: z.string().min(1)
})
type TemplateSchema = z.output<typeof templateSchema>

const templateState = reactive<Partial<TemplateSchema>>({ name: '', subject: '', body: '' })
const templateLoading = ref(false)
const showTemplateModal = ref(false)
const editingTemplateId = ref<string | null>(null)

function openAddTemplate() {
  editingTemplateId.value = null
  templateState.name = ''
  templateState.subject = ''
  templateState.body = ''
  showTemplateModal.value = true
}

function openEditTemplate(t: { id: string, name: string, subject: string, body: string }) {
  editingTemplateId.value = t.id
  templateState.name = t.name
  templateState.subject = t.subject
  templateState.body = t.body
  showTemplateModal.value = true
}

async function onSubmitTemplate(event: FormSubmitEvent<TemplateSchema>) {
  templateLoading.value = true
  try {
    if (editingTemplateId.value) {
      await $fetch(`/api/admin/notifications/templates/${editingTemplateId.value}`, { method: 'PATCH', body: event.data })
    } else {
      await $fetch('/api/admin/notifications/templates', { method: 'POST', body: event.data })
    }
    toast.add({ title: editingTemplateId.value ? 'Template updated' : 'Template saved', color: 'success' })
    showTemplateModal.value = false
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
      <div class="pt-5 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <!-- Form -->
        <div class="space-y-5">
          <!-- Smart-alert generator (Prompt 7) -->
          <div class="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-default bg-elevated/30 px-3 py-2.5">
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-sparkles"
              :loading="generatingAlert"
              @click="generateSmartAlert"
            >
              Generate smart-alert message
            </UButton>
            <span class="text-xs text-dimmed">Builds a message from the live forecast — review, pick users, send.</span>
          </div>

          <!-- Templates (click to apply · manage inline) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-dimmed">Templates</span>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-plus"
                @click="openAddTemplate">
                New template
              </UButton>
            </div>
            <div v-if="(templates as any[])?.length" class="flex flex-wrap gap-2">
              <div
                v-for="t in (templates as any[])"
                :key="t.id"
                class="group inline-flex items-center gap-0.5 rounded-lg border border-default bg-elevated/30 hover:border-primary/40 transition-colors pl-2.5 pr-1 py-1"
              >
                <button
                  type="button"
                  class="text-xs font-medium text-highlighted hover:text-primary transition-colors"
                  @click="applyTemplate(t)"
                >
                  {{ t.name }}
                </button>
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Edit template"
                  @click="openEditTemplate(t)" />
                <UButton
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  size="xs"
                  aria-label="Delete template"
                  @click="deleteTemplate(t.id)" />
              </div>
            </div>
            <p v-else class="text-xs text-dimmed">
              No templates yet — create one to reuse common messages.
            </p>
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

      <!-- Add / edit template -->
      <UModal
        v-model:open="showTemplateModal"
        :title="editingTemplateId ? 'Edit template' : 'New template'"
        description="Reusable subject + body you can apply in the Send form.">
        <template #body>
          <UForm
            :schema="templateSchema"
            :state="templateState"
            class="space-y-4"
            @submit="onSubmitTemplate">
            <div class="grid sm:grid-cols-2 gap-4">
              <UFormField label="Template name" name="name">
                <UInput v-model="templateState.name" placeholder="e.g. Low carbon alert" class="w-full" />
              </UFormField>
              <UFormField label="Subject" name="subject">
                <UInput v-model="templateState.subject" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="Body" name="body">
              <UTextarea v-model="templateState.body" :rows="4" class="w-full" />
            </UFormField>
            <div class="flex justify-end gap-2 pt-2">
              <UButton color="neutral" variant="ghost" @click="showTemplateModal = false">
                Cancel
              </UButton>
              <UButton type="submit" icon="i-lucide-check" :loading="templateLoading">
                {{ editingTemplateId ? 'Update' : 'Save template' }}
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
