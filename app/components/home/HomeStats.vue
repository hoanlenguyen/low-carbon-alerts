<script setup lang="ts">
import type { Period, Range } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

const { data: stats, refresh } = await useFetch('/api/admin/stats')

watch([() => props.period, () => props.range], refresh)

function fmtG(g: number) {
  return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`
}

const items = computed(() => [
  {
    title: 'CO₂ saved',
    icon: 'i-lucide-leaf',
    value: fmtG(stats.value?.totalSavingG ?? 0),
    to: '/admin/consumers'
  },
  {
    title: 'Total shifts',
    icon: 'i-lucide-calendar-clock',
    value: (stats.value?.totalShifts ?? 0).toLocaleString(),
    to: '/admin/consumers'
  },
  {
    title: 'Active shifters',
    icon: 'i-lucide-user-check',
    value: (stats.value?.activeShifters ?? 0).toLocaleString(),
    to: '/admin/consumers'
  },
  {
    title: 'Total Users',
    icon: 'i-lucide-users',
    value: (stats.value?.totalUsers ?? 0).toLocaleString(),
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
        {{ item.value }}
      </span>
    </UPageCard>
  </UPageGrid>
</template>
