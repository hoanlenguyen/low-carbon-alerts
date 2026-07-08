<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

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

const { data, status: fetchStatus } = await useFetch<Customer[]>(
  '/api/admin/users',
  { lazy: true }
)

// ── Filters ──
const emailFilter = ref('')
const statusFilter = ref('all')

// ── Sort ──
const sortKey = ref<keyof Customer | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: keyof Customer) {
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

const filtered = computed(() => {
  let rows = data.value ?? []
  if (emailFilter.value) {
    const q = emailFilter.value.toLowerCase()
    rows = rows.filter(r => r.email.toLowerCase().includes(q))
  }
  if (statusFilter.value !== 'all') {
    rows = rows.filter(r => r.status === statusFilter.value)
  }
  if (sortKey.value) {
    const key = sortKey.value
    const dir = sortDir.value === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      const av = a[key] ?? ''
      const bv = b[key] ?? ''
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }
  return rows
})

watch(
  [emailFilter, statusFilter],
  () => {
    pageIndex.value = 0
  }
)

const paginated = computed(() =>
  filtered.value.slice(pageIndex.value * pageSize, (pageIndex.value + 1) * pageSize)
)

// ── Formatters ──
function formatDate(val: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function copyToClipboard(text: string, description: string) {
  navigator.clipboard.writeText(text)
  toast.add({ title: 'Copied to clipboard', description })
}

// ── Columns ──
const columns: TableColumn<Customer>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted', title: row.original.id }, row.original.id.slice(0, 8) + '…')
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-3' }, [
        h(resolveComponent('UAvatar'), {
          src: row.original.avatarUrl ?? undefined,
          alt: row.original.name ?? row.original.email,
          size: 'sm'
        }),
        h('span', { class: 'font-medium text-highlighted' }, row.original.name || '—')
      ])
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, formatDate(row.original.createdAt))
  },
  {
    accessorKey: 'lastLoginAt',
    header: 'Last login',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, formatDate(row.original.lastLoginAt))
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const color = row.original.status === 'active' ? ('success' as const) : ('error' as const)
      return h(resolveComponent('UBadge'), { class: 'capitalize', variant: 'subtle', color }, () => row.original.status)
    }
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        h(
          resolveComponent('UDropdownMenu'),
          {
            content: { align: 'end' },
            items: [
              { type: 'label', label: 'Actions' },
              { label: 'Copy ID', icon: 'i-lucide-copy', onSelect: () => copyToClipboard(row.original.id, 'User ID copied') },
              { type: 'separator' },
              { label: 'Copy email', icon: 'i-lucide-mail', onSelect: () => copyToClipboard(row.original.email, 'Email copied') }
            ]
          },
          () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', class: 'ml-auto' })
        )
      )
  }
]
</script>

<template>
  <UDashboardPanel id="customers">
    <template #header>
      <UDashboardNavbar title="Customers">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="emailFilter"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filter emails..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            v-model="statusFilter"
            :items="[
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' }
            ]"
            placeholder="Filter status"
            class="min-w-28"
          />

          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-up-down"
            :label="sortKey ? `${sortKey} ${sortDir === 'asc' ? '↑' : '↓'}` : 'Sort'"
            @click="toggleSort('email')"
          />
        </div>
      </div>

      <UTable
        class="shrink-0"
        :data="paginated"
        :columns="columns"
        :loading="fetchStatus === 'pending'"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <div class="text-sm text-muted">
          {{ filtered.length }} row(s)
        </div>

        <UPagination
          :page="pageIndex + 1"
          :items-per-page="pageSize"
          :total="filtered.length"
          @update:page="(p: number) => { pageIndex = p - 1 }"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
