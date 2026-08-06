<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

type Customer = {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  status: 'active' | 'inactive'
  createdAt: string
  lastLoginAt: string | null
}

const toast = useToast()

const { data, status: fetchStatus, refresh } = await useFetch<Customer[]>(
  '/api/admin/users',
  { lazy: true }
)

// ── Filters ──
const searchQuery = ref('')
const statusFilter = ref('all')

// ── Sort ──
const sortKey = ref<'email' | 'createdAt' | 'lastLoginAt'>('createdAt')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(key: typeof sortKey.value) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

// ── Pagination ──
const pageSize = 10
const pageIndex = ref(0)

watch([searchQuery, statusFilter], () => { pageIndex.value = 0 })

const filtered = computed(() => {
  let rows = data.value ?? []
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(r =>
      r.email.toLowerCase().includes(q) ||
      (r.name ?? '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value !== 'all') {
    rows = rows.filter(r => r.status === statusFilter.value)
  }
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    return av < bv ? -dir : av > bv ? dir : 0
  })
})

const paginated = computed(() =>
  filtered.value.slice(pageIndex.value * pageSize, (pageIndex.value + 1) * pageSize)
)

// ── Recency ──
function recencyLabel(val: string | null): { label: string; cls: string } {
  if (!val) return { label: 'Never', cls: 'text-dimmed' }
  const diff = Date.now() - new Date(val).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return { label: 'Today', cls: 'text-success' }
  if (days === 1) return { label: 'Yesterday', cls: 'text-success' }
  if (days <= 7) return { label: `${days}d ago`, cls: 'text-muted' }
  if (days <= 30) return { label: `${days}d ago`, cls: 'text-muted' }
  return { label: `${days}d ago`, cls: 'text-warning' }
}

function formatJoined(val: string) {
  return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Helsinki' })
}

function copyToClipboard(text: string, description: string) {
  navigator.clipboard.writeText(text)
  toast.add({ title: 'Copied', description })
}
</script>

<template>
  <UDashboardPanel id="customers">
    <template #header>
      <UDashboardNavbar title="Energy consumers">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-5">
        <UInput
          v-model="searchQuery"
          class="w-full sm:max-w-xs"
          icon="i-lucide-search"
          placeholder="Search name or email…"
        />
        <div class="flex items-center gap-2">
          <USelect
            v-model="statusFilter"
            :items="[
              { label: 'All statuses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' }
            ]"
            class="min-w-32"
          />
          <CustomersAddModal @created="refresh" />
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr class="bg-elevated/50">
              <th
                class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default cursor-pointer select-none hover:text-muted transition-colors"
                @click="toggleSort('email')"
              >
                User
                <span v-if="sortKey === 'email'" class="ml-1 text-primary">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default">
                Status
              </th>
              <th
                class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default cursor-pointer select-none hover:text-muted transition-colors"
                @click="toggleSort('createdAt')"
              >
                Joined
                <span v-if="sortKey === 'createdAt'" class="ml-1 text-primary">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th
                class="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-dimmed border-b border-default cursor-pointer select-none hover:text-muted transition-colors"
                @click="toggleSort('lastLoginAt')"
              >
                Last login
                <span v-if="sortKey === 'lastLoginAt'" class="ml-1 text-primary">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th class="border-b border-default w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="fetchStatus === 'pending'">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">
                Loading…
              </td>
            </tr>
            <tr v-else-if="paginated.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-muted">
                No customers found.
              </td>
            </tr>
            <tr
              v-for="customer in paginated"
              v-else
              :key="customer.id"
              class="group hover:bg-elevated/40 transition-colors"
            >
              <!-- User -->
              <td class="px-4 py-3 border-b border-default">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :src="customer.avatarUrl ?? undefined"
                    :alt="customer.name ?? customer.email"
                    size="sm"
                  />
                  <div class="min-w-0">
                    <p class="font-medium text-highlighted truncate">
                      {{ customer.name || '—' }}
                    </p>
                    <p class="text-xs text-muted truncate">
                      {{ customer.email }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- Status -->
              <td class="px-4 py-3 border-b border-default">
                <UBadge
                  :color="customer.status === 'active' ? 'success' : 'neutral'"
                  variant="subtle"
                  class="capitalize"
                >
                  {{ customer.status }}
                </UBadge>
              </td>

              <!-- Joined -->
              <td class="px-4 py-3 border-b border-default text-sm text-muted tabular-nums">
                {{ formatJoined(customer.createdAt) }}
              </td>

              <!-- Last login -->
              <td class="px-4 py-3 border-b border-default">
                <span
                  class="text-xs font-mono"
                  :class="recencyLabel(customer.lastLoginAt).cls"
                >
                  {{ recencyLabel(customer.lastLoginAt).label }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-3 py-3 border-b border-default">
                <UDropdownMenu
                  :content="{ align: 'end' }"
                  :items="[
                    { type: 'label', label: customer.email },
                    { label: 'Copy ID', icon: 'i-lucide-copy', onSelect: () => copyToClipboard(customer.id, 'User ID copied') },
                    { label: 'Copy email', icon: 'i-lucide-mail', onSelect: () => copyToClipboard(customer.email, 'Email copied') }
                  ]"
                >
                  <UButton
                    icon="i-lucide-ellipsis-vertical"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Customer actions"
                  />
                </UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-3 pt-4 mt-2">
        <p class="text-xs text-muted tabular-nums">
          <template v-if="filtered.length > 0">
            {{ pageIndex * pageSize + 1 }}–{{ Math.min((pageIndex + 1) * pageSize, filtered.length) }} of {{ filtered.length }}
          </template>
          <template v-else>
            0 results
          </template>
        </p>
        <UPagination
          v-if="filtered.length > pageSize"
          :page="pageIndex + 1"
          :items-per-page="pageSize"
          :total="filtered.length"
          size="xs"
          @update:page="(p: number) => { pageIndex = p - 1 }"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
