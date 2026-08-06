<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const toast = useToast()
const TZ = 'Europe/Helsinki'

// ── Settings ────────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().int().min(1).max(200),
  debounceHours: z.number().int().min(1).max(24)
})
type SettingsSchema = z.output<typeof settingsSchema>

const { data: settings, refresh: refreshSettings } = await useFetch('/api/admin/smart-alert/settings')
const form = reactive<SettingsSchema>({
  enabled: settings.value?.enabled ?? true,
  threshold: settings.value?.threshold ?? 20,
  debounceHours: settings.value?.debounceHours ?? 3
})
const saving = ref(false)

async function onSave(event: FormSubmitEvent<SettingsSchema>) {
  saving.value = true
  try {
    await $fetch('/api/admin/smart-alert/settings', { method: 'PATCH', body: event.data })
    toast.add({ title: 'Settings saved', color: 'success' })
    await Promise.all([refreshSettings(), refreshAudit()])
  } catch {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Alert history ────────────────────────────────────────────────────────────
const { data: history, refresh: refreshHistory } = await useFetch('/api/admin/smart-alert/history')

// ── Audit log ────────────────────────────────────────────────────────────────
const { data: auditLogs, refresh: refreshAudit } = await useFetch('/api/admin/smart-alert/audit')

function fmtTime(val: string | Date | null | undefined) {
  if (!val) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ
  }).format(new Date(val as string))
}

function diffBadge(before: Record<string, unknown> | null, after: Record<string, unknown> | null, key: string) {
  if (!before || !after) return null
  if (before[key] === after[key]) return null
  return { from: before[key], to: after[key] }
}
</script>

<template>
  <UDashboardPanel id="smart-alert">
    <template #header>
      <UDashboardNavbar title="Smart Alert">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            size="sm"
            @click="() => { refreshHistory(); refreshAudit() }"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">

        <!-- Settings -->
        <section>
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-highlighted">
              Configuration
            </h2>
            <p class="text-sm text-muted mt-0.5">
              Controls when the AI generates and broadcasts a low-carbon push notification.
            </p>
          </div>

          <UPageCard variant="subtle">
            <UForm
              :schema="settingsSchema"
              :state="form"
              class="space-y-5"
              @submit="onSave"
            >
              <!-- Enable toggle -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-highlighted">
                    Enable smart alerts
                  </p>
                  <p class="text-xs text-muted mt-0.5">
                    When off, the cron job skips AI alert generation entirely.
                  </p>
                </div>
                <UToggle v-model="form.enabled" />
              </div>

              <USeparator />

              <!-- Threshold -->
              <UFormField
                name="threshold"
                label="Carbon threshold (gCO₂/kWh)"
                description="An alert is sent when current intensity falls below this value."
              >
                <div class="flex items-center gap-3">
                  <UInput
                    v-model.number="form.threshold"
                    type="number"
                    min="1"
                    max="200"
                    class="w-28"
                  />
                  <span class="text-sm text-muted">gCO₂/kWh</span>
                </div>
              </UFormField>

              <!-- Debounce -->
              <UFormField
                name="debounceHours"
                label="Debounce window (hours)"
                description="Minimum gap between two consecutive smart alerts."
              >
                <div class="flex items-center gap-3">
                  <UInput
                    v-model.number="form.debounceHours"
                    type="number"
                    min="1"
                    max="24"
                    class="w-28"
                  />
                  <span class="text-sm text-muted">hours</span>
                </div>
              </UFormField>

              <div class="flex justify-end pt-1">
                <UButton type="submit" :loading="saving">
                  Save settings
                </UButton>
              </div>
            </UForm>
          </UPageCard>
        </section>

        <!-- Alert history -->
        <section>
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-highlighted">
              Sent alerts
            </h2>
            <p class="text-sm text-muted mt-0.5">
              Last 50 AI-generated notifications broadcast to users.
            </p>
          </div>

          <UPageCard variant="subtle" :ui="{ body: 'p-0' }">
            <div v-if="!history?.length" class="py-10 text-center text-sm text-muted">
              No smart alerts sent yet.
            </div>
            <ul v-else class="divide-y divide-default">
              <li
                v-for="alert in history"
                :key="alert.id"
                class="px-4 sm:px-6 py-3 space-y-0.5"
              >
                <div class="flex items-start justify-between gap-4">
                  <p class="text-sm font-medium text-highlighted leading-snug">
                    {{ alert.subject }}
                  </p>
                  <span class="text-xs text-dimmed shrink-0 tabular-nums">
                    {{ fmtTime(alert.sentAt) }}
                  </span>
                </div>
                <p class="text-xs text-muted leading-relaxed">
                  {{ alert.body }}
                </p>
              </li>
            </ul>
          </UPageCard>
        </section>

        <!-- Audit log -->
        <section>
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-highlighted">
              Audit log
            </h2>
            <p class="text-sm text-muted mt-0.5">
              Every settings change with before/after values and the admin who made it.
            </p>
          </div>

          <UPageCard variant="subtle" :ui="{ body: 'p-0' }">
            <div v-if="!auditLogs?.length" class="py-10 text-center text-sm text-muted">
              No changes recorded yet.
            </div>
            <ul v-else class="divide-y divide-default">
              <li
                v-for="log in auditLogs"
                :key="log.id"
                class="px-4 sm:px-6 py-4 space-y-2"
              >
                <div class="flex items-center justify-between gap-4">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-user" class="size-3.5 text-dimmed shrink-0" />
                    <span class="text-sm font-medium text-highlighted">{{ log.userEmail }}</span>
                  </div>
                  <span class="text-xs text-dimmed tabular-nums shrink-0">{{ fmtTime(log.createdAt) }}</span>
                </div>

                <!-- Show only fields that changed -->
                <div class="flex flex-wrap gap-2">
                  <template v-for="key in ['enabled', 'threshold', 'debounceHours']" :key="key">
                    <div
                      v-if="diffBadge(log.before, log.after, key)"
                      class="flex items-center gap-1.5 rounded-md bg-elevated px-2.5 py-1 text-xs"
                    >
                      <span class="text-muted capitalize">{{ key }}:</span>
                      <span class="line-through text-error">{{ String(diffBadge(log.before, log.after, key)!.from) }}</span>
                      <UIcon name="i-lucide-arrow-right" class="size-3 text-dimmed" />
                      <span class="text-success font-medium">{{ String(diffBadge(log.before, log.after, key)!.to) }}</span>
                    </div>
                  </template>
                </div>
              </li>
            </ul>
          </UPageCard>
        </section>

      </div>
    </template>
  </UDashboardPanel>
</template>
