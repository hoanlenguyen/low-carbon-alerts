<script setup lang="ts">
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const { data: stats, refresh } = await useFetch('/api/admin/stats')

watch([() => props.period, () => props.range], refresh)

const items = computed(() => [
  {
    title: 'Total Users',
    icon: 'i-lucide-users',
    value: stats.value?.totalUsers ?? 0,
    to: '/admin/consumers'
  },
  {
    title: 'Messages Sent',
    icon: 'i-lucide-send',
    value: stats.value?.totalMessages ?? 0,
    to: '/admin/notifications'
  },
  {
    title: 'Active Jobs',
    icon: 'i-lucide-clock',
    value: stats.value?.activeJobs ?? 0,
    to: '/admin/notifications'
  },
  {
    title: 'Unread',
    icon: 'i-lucide-bell',
    value: stats.value?.unreadMessages ?? 0,
    to: '/admin/consumers'
  }
])
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="item in items"
      :key="item.title"
      :icon="item.icon"
      :title="item.title"
      :to="item.to"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase tracking-wide'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <span class="text-2xl font-semibold text-highlighted tabular-nums">
        {{ item.value.toLocaleString() }}
      </span>
    </UPageCard>
  </UPageGrid>
</template>
