<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { upperFirst } from 'scule'
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'

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

const UAvatar = resolveComponent('UAvatar')
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')

const toast = useToast()
const table = useTemplateRef('table')

const columnFilters = ref([{ id: 'email', value: '' }])
const columnVisibility = ref()
const rowSelection = ref({})

const { data, status: fetchStatus } = await useFetch<Customer[]>(
  '/api/admin/users',
  { lazy: true }
)

function formatDate(val: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getRowItems(row: Row<Customer>) {
  return [
    { type: 'label', label: 'Actions' },
    {
      label: 'Copy ID',
      icon: 'i-lucide-copy',
      onSelect() {
        navigator.clipboard.writeText(row.original.id)
        toast.add({ title: 'Copied to clipboard', description: 'User ID copied' })
      }
    },
    { type: 'separator' },
    {
      label: 'Copy email',
      icon: 'i-lucide-mail',
      onSelect() {
        navigator.clipboard.writeText(row.original.email)
        toast.add({ title: 'Copied to clipboard', description: 'Email copied' })
      }
    }
  ]
}

const columns: TableColumn<Customer>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        'modelValue': table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!value),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
          row.toggleSelected(!!value),
        'ariaLabel': 'Select row'
      })
  },
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
        h(UAvatar, {
          src: row.original.avatarUrl ?? undefined,
          alt: row.original.name ?? row.original.email,
          size: 'sm'
        }),
        h('span', { class: 'font-medium text-highlighted' }, row.original.name || '—')
      ])
  },
  {
    accessorKey: 'email',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Email',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
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
    filterFn: 'equals',
    cell: ({ row }) => {
      const color = row.original.status === 'active' ? ('success' as const) : ('error' as const)
      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => row.original.status)
    }
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          { content: { align: 'end' }, items: getRowItems(row) },
          () => h(UButton, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', class: 'ml-auto' })
        )
      )
  }
]

const statusFilter = ref('all')

watch(statusFilter, (newVal) => {
  if (!table?.value?.tableApi) return
  const col = table.value.tableApi.getColumn('status')
  if (!col) return
  col.setFilterValue(newVal === 'all' ? undefined : newVal)
})

const email = computed({
  get: (): string => (table.value?.tableApi?.getColumn('email')?.getFilterValue() as string) || '',
  set: (value: string) => table.value?.tableApi?.getColumn('email')?.setFilterValue(value || undefined)
})

const pagination = ref({ pageIndex: 0, pageSize: 10 })
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
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="email"
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
            :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
            placeholder="Filter status"
            class="min-w-28"
          />

          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) {
                    e?.preventDefault()
                  }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        class="shrink-0"
        :data="data ?? []"
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
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
          {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} row(s) selected.
        </div>

        <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
