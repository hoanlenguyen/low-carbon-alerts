<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

type RecentMessage = {
  id: string
  subject: string
  type: 'broadcast' | 'targeted' | 'smart-alert' | 'forecast'
  sentAt: string | null
  createdAt: string
  recipients: number
}

const UBadge = resolveComponent('UBadge')

const { data, refresh } = await useFetch<RecentMessage[]>('/api/admin/recent-messages')

watch([() => props.period, () => props.range], refresh)

const columns: TableColumn<RecentMessage>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: ({ row }) => h('span', { class: 'font-medium truncate max-w-xs block' }, row.getValue('subject'))
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => h(UBadge, {
      variant: 'subtle',
      color: row.getValue('type') === 'broadcast' ? 'primary' : 'neutral',
      class: 'capitalize'
    }, () => row.getValue('type'))
  },
  {
    accessorKey: 'recipients',
    header: 'Recipients',
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, (row.getValue('recipients') as number).toLocaleString())
  },
  {
    accessorKey: 'sentAt',
    header: 'Sent',
    cell: ({ row }) => {
      const val = row.getValue('sentAt') as string | null
      if (!val) return h('span', { class: 'text-dimmed' }, '—')
      return new Date(val).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Helsinki'
      })
    }
  }
]
</script>

<template>
  <div class="shrink-0">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
        Recent Messages
      </p>
      <UButton
        to="/admin/messages"
        variant="ghost"
        color="neutral"
        size="xs"
        trailing-icon="i-lucide-arrow-right">
        View all
      </UButton>
    </div>

    <div v-if="!data?.length" class="text-sm text-muted text-center py-8 border border-dashed border-default rounded-lg">
      No messages sent yet.
    </div>

    <UTable
      v-else
      :data="data"
      :columns="columns"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default'
      }"
    />
  </div>
</template>
