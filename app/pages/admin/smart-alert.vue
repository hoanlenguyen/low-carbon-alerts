<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const toast = useToast()
const TZ = 'Europe/Helsinki'

// ── Settings ─────────────────────────────────────────────────────────────────
const settingsSchema = z.object({
  threshold: z.number().int().min(1).max(200),
  debounceHours: z.number().int().min(1).max(24),
  horizonHours: z.number().int().min(1).max(24)
})
type SettingsSchema = z.output<typeof settingsSchema>

const { data: settings, refresh: refreshSettings } = useFetch('/api/admin/smart-alert/settings', { server: false })

const enabled = ref(true)
const togglingEnabled = ref(false)

const form = reactive<SettingsSchema>({
  threshold: 20,
  debounceHours: 3,
  horizonHours: 6
})

watch(settings, (s) => {
  if (!s) return
  enabled.value = s.enabled
  form.threshold = s.threshold
  form.debounceHours = s.debounceHours
  form.horizonHours = s.horizonHours
}, { immediate: true })

async function onToggleEnabled() {
  togglingEnabled.value = true
  try {
    await $fetch('/api/admin/smart-alert/settings', {
      method: 'PATCH',
      body: { enabled: enabled.value, threshold: form.threshold, debounceHours: form.debounceHours, horizonHours: form.horizonHours }
    })
    await Promise.all([refreshSettings(), refreshAudit()])
  } catch {
    enabled.value = !enabled.value
    toast.add({ title: 'Failed to update', color: 'error' })
  } finally {
    togglingEnabled.value = false
  }
}

const saving = ref(false)

async function onSave(event: FormSubmitEvent<SettingsSchema>) {
  saving.value = true
  try {
    await $fetch('/api/admin/smart-alert/settings', {
      method: 'PATCH',
      body: { enabled: enabled.value, ...event.data }
    })
    toast.add({ title: 'Settings saved', color: 'success' })
    await Promise.all([refreshSettings(), refreshAudit()])
  } catch {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Alert history (paginated) ──────────────────────────────────────────────────
interface HistoryRow { id: string, subject: string, body: string, sentAt: string | null, recipient: string | null }
const historyPage = ref(1)
const { data: historyData, refresh: refreshHistory } = useFetch<{ data: HistoryRow[], total: number, pageCount: number }>('/api/admin/smart-alert/history', {
  server: false,
  query: { page: historyPage }
})
const history = computed(() => historyData.value?.data ?? null)
const historyTotal = computed(() => historyData.value?.total ?? 0)
const historyPageCount = computed(() => historyData.value?.pageCount ?? 1)

// ── Trigger runs (last success + paginated run log) ────────────────────────────
interface RunRow { id: string, ranAt: string | null, windowFound: boolean, carbonIntensity: number | null, windowStart: string | null, windowEnd: string | null, recipientCount: number }
const runsPage = ref(1)
const { data: runsData, refresh: refreshRuns } = useFetch<{ lastSent: RunRow | null, runs: RunRow[], total: number, pageCount: number }>('/api/admin/smart-alert/runs', {
  server: false,
  query: { page: runsPage }
})
const lastSent = computed(() => runsData.value?.lastSent ?? null)
const runs = computed(() => runsData.value?.runs ?? [])
const runsTotal = computed(() => runsData.value?.total ?? 0)
const runsPageCount = computed(() => runsData.value?.pageCount ?? 1)

const runningNow = ref(false)
async function runNow() {
  runningNow.value = true
  try {
    const res = await $fetch<{ windowFound: boolean, sent: number, reason?: string }>(
      '/api/admin/smart-alert/run',
      { method: 'POST' }
    )
    const desc = res.sent > 0
      ? `Sent to ${res.sent} user${res.sent === 1 ? '' : 's'}`
      : res.windowFound
        ? (res.reason === 'debounced' ? 'Window found, but debounced' : 'Window found, but no eligible users')
        : (res.reason === 'disabled' ? 'Smart alerts are disabled' : 'No low-carbon window right now')
    toast.add({ title: 'Smart alert run complete', description: desc, color: res.sent > 0 ? 'success' : 'neutral' })
    runsPage.value = 1
    await refreshRuns()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Run failed', color: 'error' })
  } finally {
    runningNow.value = false
  }
}

// ── Audit log ─────────────────────────────────────────────────────────────────
const auditPage = ref(1)
const { data: auditResponse, refresh: refreshAudit } = useFetch('/api/admin/smart-alert/audit', {
  server: false,
  query: { page: auditPage }
})
const auditLogs = computed(() => auditResponse.value?.data ?? null)
const auditPageCount = computed(() => auditResponse.value?.pageCount ?? 1)
const auditTotal = computed(() => auditResponse.value?.total ?? 0)

// ── Test smart alert (send a personalized alert to one user, verify content) ────
const { data: users } = useFetch<{ id: string, name: string | null, email: string }[]>('/api/admin/users', { server: false })
const testAlertUserId = ref<string>()
const testAlertLoading = ref(false)
const testAlertResult = ref<{ to: string, subject: string, body: string } | null>(null)

async function sendTestSmartAlert() {
  if (!testAlertUserId.value) return
  testAlertLoading.value = true
  try {
    const res = await $fetch<{ to: string, subject: string, body: string }>(
      '/api/admin/notifications/smart-alert-test',
      { method: 'POST', body: { userId: testAlertUserId.value } }
    )
    testAlertResult.value = res
    toast.add({ title: 'Test smart alert sent', description: `Delivered to ${res.to}`, color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    toast.add({ title: err?.data?.statusMessage || 'Could not send test alert', color: 'error' })
  } finally {
    testAlertLoading.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: TZ
})

function fmtTime(val: string | Date | null | undefined) {
  if (!val) return '—'
  return timeFmt.format(new Date(val as string))
}

function diffBadge(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  key: string
) {
  if (!before || !after) return null
  if (before[key] === after[key]) return null
  return { from: before[key], to: after[key] }
}

const keyLabel: Record<string, string> = {
  enabled: 'Enabled',
  threshold: 'Threshold',
  horizonHours: 'Horizon',
  debounceHours: 'Debounce'
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
            @click="() => { refreshHistory(); refreshAudit(); refreshRuns() }"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">
        <!-- Configuration -->
        <section>
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-highlighted">
              Configuration
            </h2>
            <p class="text-sm text-muted mt-0.5">
              Controls when the AI generates and broadcasts a low-carbon push notification.
            </p>
          </div>

          <!-- Toggle card — saves instantly on change -->
          <UPageCard variant="subtle" class="mb-3">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div
                  class="size-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  :class="enabled ? 'bg-primary/10' : 'bg-elevated'"
                >
                  <UIcon
                    name="i-lucide-zap"
                    class="size-4 transition-colors"
                    :class="enabled ? 'text-primary' : 'text-dimmed'"
                  />
                </div>
                <div>
                  <p class="text-sm font-medium text-highlighted">
                    Smart alerts on forecast
                  </p>
                  <p class="text-xs text-muted mt-0.5">
                    Each cron run scans the forecast and alerts users whose active hours cover an upcoming window.
                  </p>
                </div>
              </div>
              <USwitch
                v-model="enabled"
                :loading="togglingEnabled"
                @update:model-value="onToggleEnabled"
              />
            </div>
          </UPageCard>

          <!-- Threshold + debounce form -->
          <UPageCard variant="subtle">
            <UForm
              :schema="settingsSchema"
              :state="form"
              class="space-y-5"
              @submit="onSave"
            >
              <UFormField
                name="threshold"
                label="Carbon threshold (gCO₂/kWh)"
                description="A low-carbon window is one where forecast intensity stays below this value."
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

              <UFormField
                name="horizonHours"
                label="Look-ahead horizon (hours)"
                description="How far ahead to scan the forecast for an upcoming window (≥3 consecutive hours)."
              >
                <div class="flex items-center gap-3">
                  <UInput
                    v-model.number="form.horizonHours"
                    type="number"
                    min="1"
                    max="24"
                    class="w-28"
                  />
                  <span class="text-sm text-muted">hours</span>
                </div>
              </UFormField>

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

        <!-- Trigger history -->
        <section>
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-highlighted">
                Trigger history
              </h2>
              <p class="text-sm text-muted mt-0.5">
                When the smart-alert cron last ran and how many users it reached.
              </p>
            </div>
            <UButton
              size="xs"
              icon="i-lucide-play"
              :loading="runningNow"
              @click="runNow"
            >
              Run now
            </UButton>
          </div>

          <!-- Last successful -->
          <UPageCard variant="subtle" class="mb-3">
            <div class="flex items-center gap-3">
              <div
                class="size-8 rounded-full flex items-center justify-center shrink-0"
                :class="lastSent ? 'bg-success/10' : 'bg-elevated'"
              >
                <UIcon name="i-lucide-bell-ring" class="size-4" :class="lastSent ? 'text-success' : 'text-dimmed'" />
              </div>
              <div v-if="lastSent">
                <p class="text-sm font-medium text-highlighted">
                  Last alert sent {{ fmtTime(lastSent.ranAt) }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  Reached {{ lastSent.recipientCount }} user{{ lastSent.recipientCount === 1 ? '' : 's' }}<template v-if="lastSent.windowStart">
                    · window {{ lastSent.windowStart }}–{{ lastSent.windowEnd }} at {{ lastSent.carbonIntensity }} gCO₂/kWh
                  </template>
                </p>
              </div>
              <div v-else>
                <p class="text-sm font-medium text-highlighted">
                  No smart alerts sent yet
                </p>
                <p class="text-xs text-muted mt-0.5">
                  Runs appear here once the cron fires and a low-carbon window is found.
                </p>
              </div>
            </div>
          </UPageCard>

          <!-- Recent runs -->
          <UPageCard variant="subtle" :ui="{ body: 'p-0' }">
            <div v-if="!runs.length" class="py-8 text-center text-sm text-muted">
              No runs recorded yet.
            </div>
            <ul v-else class="divide-y divide-default">
              <li
                v-for="r in runs"
                :key="r.id"
                class="px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <UBadge
                    :color="r.windowFound ? (r.recipientCount ? 'success' : 'warning') : 'neutral'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ r.windowFound ? (r.recipientCount ? 'Sent' : 'Window · not sent') : 'No window' }}
                  </UBadge>
                  <span v-if="r.windowStart" class="text-xs text-muted tabular-nums truncate">
                    {{ r.windowStart }}–{{ r.windowEnd }} · {{ r.carbonIntensity }} gCO₂/kWh
                  </span>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <span class="text-xs text-muted tabular-nums">{{ r.recipientCount }} user{{ r.recipientCount === 1 ? '' : 's' }}</span>
                  <span class="text-xs text-dimmed tabular-nums">{{ fmtTime(r.ranAt) }}</span>
                </div>
              </li>
            </ul>
            <div v-if="runsPageCount > 1" class="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-default">
              <span class="text-xs text-muted tabular-nums">{{ runsTotal }} total</span>
              <UPagination
                v-model:page="runsPage"
                :total="runsTotal"
                :page-size="10"
                size="xs" />
            </div>
          </UPageCard>
        </section>

        <!-- Test smart alert -->
        <section>
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-highlighted">
              Test smart alert
            </h2>
            <p class="text-sm text-muted mt-0.5">
              Send a personalized smart-alert to one user from the live forecast — to verify the real message content.
            </p>
          </div>

          <UPageCard variant="subtle">
            <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
              <UFormField class="flex-1">
                <USelectMenu
                  v-model="testAlertUserId"
                  :items="(users ?? []).map(u => ({ label: u.name ? `${u.name} · ${u.email}` : u.email, value: u.id }))"
                  value-key="value"
                  placeholder="Select a consumer"
                  class="w-full"
                  clear
                />
              </UFormField>
              <UButton
                icon="i-lucide-send-horizontal"
                :loading="testAlertLoading"
                :disabled="!testAlertUserId"
                @click="sendTestSmartAlert">
                Send test alert
              </UButton>
            </div>

            <div v-if="testAlertResult" class="mt-4 rounded-lg border border-default bg-elevated/40 p-3 space-y-1">
              <p class="text-xs text-dimmed">
                Sent to {{ testAlertResult.to }}
              </p>
              <p class="text-sm font-semibold text-highlighted leading-snug">
                {{ testAlertResult.subject }}
              </p>
              <p class="text-sm text-muted leading-relaxed">
                {{ testAlertResult.body }}
              </p>
            </div>
          </UPageCard>
        </section>

        <!-- Sent alerts -->
        <section>
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-highlighted">
              Sent alerts
            </h2>
            <p class="text-sm text-muted mt-0.5">
              Smart-alert notifications sent to eligible users.
            </p>
          </div>

          <UPageCard variant="subtle" :ui="{ body: 'p-0' }">
            <div v-if="!history" class="py-10 flex justify-center">
              <UIcon name="i-lucide-loader-circle" class="size-5 text-muted animate-spin" />
            </div>
            <div v-else-if="!history.length" class="py-10 text-center text-sm text-muted">
              No smart alerts sent yet.
            </div>
            <template v-else>
              <ul class="divide-y divide-default">
                <li
                  v-for="alert in history"
                  :key="alert.id"
                  class="px-4 sm:px-6 py-3 space-y-1"
                >
                  <div class="flex items-start justify-between gap-4">
                    <p class="text-sm font-medium text-highlighted leading-snug">
                      {{ alert.subject }}
                    </p>
                    <span class="text-xs text-dimmed shrink-0 tabular-nums">{{ fmtTime(alert.sentAt) }}</span>
                  </div>
                  <p v-if="alert.recipient" class="text-xs text-dimmed leading-relaxed flex items-center gap-1">
                    <UIcon name="i-lucide-user" class="size-3 shrink-0" />
                    {{ alert.recipient }}
                  </p>
                  <p class="text-xs text-muted leading-relaxed">
                    {{ alert.body }}
                  </p>
                </li>
              </ul>
              <div v-if="historyPageCount > 1" class="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-default">
                <span class="text-xs text-muted tabular-nums">{{ historyTotal }} total</span>
                <UPagination
                  v-model:page="historyPage"
                  :total="historyTotal"
                  :page-size="10"
                  size="xs" />
              </div>
            </template>
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
            <div v-if="!auditLogs" class="py-10 flex justify-center">
              <UIcon name="i-lucide-loader-circle" class="size-5 text-muted animate-spin" />
            </div>
            <div v-else-if="!auditLogs.length" class="py-10 text-center text-sm text-muted">
              No changes recorded yet.
            </div>
            <template v-else>
              <ul class="divide-y divide-default">
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
                  <div class="flex flex-wrap gap-2">
                    <template
                      v-for="key in ['enabled', 'threshold', 'horizonHours', 'debounceHours']"
                      :key="key"
                    >
                      <div
                        v-if="diffBadge(log.before as Record<string, unknown> | null, log.after as Record<string, unknown> | null, key)"
                        class="flex items-center gap-1.5 rounded-md bg-elevated px-2.5 py-1 text-xs"
                      >
                        <span class="text-muted">{{ keyLabel[key] }}:</span>
                        <span class="line-through text-error">{{ String(diffBadge(log.before as Record<string, unknown> | null, log.after as Record<string, unknown> | null, key)!.from) }}</span>
                        <UIcon name="i-lucide-arrow-right" class="size-3 text-dimmed" />
                        <span class="text-success font-medium">{{ String(diffBadge(log.before as Record<string, unknown> | null, log.after as Record<string, unknown> | null, key)!.to) }}</span>
                      </div>
                    </template>
                  </div>
                </li>
              </ul>
              <div v-if="auditPageCount > 1" class="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-t border-default">
                <span class="text-xs text-muted tabular-nums">{{ auditTotal }} total</span>
                <UPagination
                  v-model:page="auditPage"
                  :total="auditTotal"
                  :page-size="10"
                  size="xs" />
              </div>
            </template>
          </UPageCard>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
