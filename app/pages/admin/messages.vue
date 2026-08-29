<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const TZ = 'Europe/Helsinki'
const PAGE_SIZE = 10

const page = ref(1)
const { data, status: fetchStatus } = await useFetch<Pagination<SentMessageRow>>(
  '/api/admin/messages',
  { lazy: true, query: { page, limit: PAGE_SIZE } }
)

const rows = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.total ?? 0)
const pageSize = computed(() => data.value?.pageSize ?? PAGE_SIZE)

// ── Content collapse ──────────────────────────────────────────────────────────
// Long bodies are clamped to two lines; only offer a toggle when the text is long
// enough to overflow that (heuristic on length).
const LONG = 120
const expanded = ref<Set<string>>(new Set())
function toggle(id: string) {
  const next = new Set(expanded.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expanded.value = next
}

const typeColor = (t: SentMessageRow['type']) =>
  t === 'broadcast' ? 'primary'
    : t === 'forecast' ? 'info'
      : t === 'smart-alert' ? 'warning'
        : 'neutral'

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
})
function fmtTime(val: string | Date | null) {
  if (!val) return '—'
  return timeFmt.format(new Date(val as string))
}
</script>

<template>
  <UDashboardPanel id="messages">
    <template #header>
      <UDashboardNavbar title="Sent messages">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Toolbar -->
      <div class="flex items-center justify-end mb-4">
        <UButton
          to="/api/admin/messages/export"
          external
          icon="i-lucide-download"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          Export CSV
        </UButton>
      </div>

      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr class="bg-elevated/50">
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default w-52">Subject</th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">Content</th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default w-28">Type</th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default w-56">Recipient</th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default w-40">Sent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="fetchStatus === 'pending'">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">Loading…</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">No messages sent yet.</td>
            </tr>
            <tr
              v-for="m in rows"
              v-else
              :key="m.id"
              class="align-top hover:bg-elevated/40 transition-colors"
            >
              <!-- Subject -->
              <td class="px-4 py-3 border-b border-default">
                <p class="font-medium text-highlighted">{{ m.subject }}</p>
              </td>
              <!-- Content -->
              <td class="px-4 py-3 border-b border-default max-w-md">
                <p
                  class="text-muted whitespace-pre-line leading-relaxed"
                  :class="expanded.has(m.id) ? '' : 'line-clamp-2'"
                >
                  {{ m.body }}
                </p>
                <button
                  v-if="m.body.length > LONG"
                  type="button"
                  class="mt-1 text-xs text-primary hover:underline cursor-pointer"
                  @click="toggle(m.id)"
                >
                  {{ expanded.has(m.id) ? 'Show less' : 'Show more' }}
                </button>
              </td>
              <!-- Type -->
              <td class="px-4 py-3 border-b border-default">
                <UBadge :color="typeColor(m.type)" variant="subtle" class="capitalize">{{ m.type }}</UBadge>
              </td>
              <!-- Recipient -->
              <td class="px-4 py-3 border-b border-default">
                <div v-if="m.recipient" class="min-w-0">
                  <p class="text-highlighted truncate">{{ m.recipient.name || '—' }}</p>
                  <p class="text-xs text-muted truncate">{{ m.recipient.email }}</p>
                </div>
                <span v-else class="text-muted tabular-nums">
                  {{ m.recipients.toLocaleString() }} recipients
                </span>
              </td>
              <!-- Sent -->
              <td class="px-4 py-3 border-b border-default text-sm text-muted tabular-nums whitespace-nowrap">
                {{ fmtTime(m.sentAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-3 pt-4">
        <span class="text-xs text-muted tabular-nums">{{ total }} total</span>
        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
          size="xs"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
