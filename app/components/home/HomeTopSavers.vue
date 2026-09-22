<script setup lang="ts">
type Saver = { userId: string, userName: string, name: string | null, savingG: number, shifts: number }

const { data: savers } = await useFetch<Saver[]>('/api/admin/stats/top-savers', {
  lazy: true,
  default: () => []
})

const fmtG = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`)
const medal = (i: number) => (['🥇', '🥈', '🥉'][i] ?? `${i + 1}`)
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-trophy" class="size-4 text-primary shrink-0" />
        <span class="font-semibold text-sm text-highlighted">Top savers</span>
      </div>
    </template>

    <ul v-if="savers.length" role="list" class="divide-y divide-default">
      <li
        v-for="(s, i) in savers"
        :key="s.userId"
        class="flex items-center gap-3 px-4 py-3 sm:px-6"
      >
        <span class="w-6 shrink-0 text-center text-sm tabular-nums">{{ medal(i) }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-highlighted">
            {{ s.name || s.userName }}
          </p>
          <p class="truncate text-xs text-muted">
            {{ s.shifts }} shift{{ s.shifts === 1 ? '' : 's' }}
          </p>
        </div>
        <span class="shrink-0 text-sm font-semibold text-success tabular-nums">
          ≈ {{ fmtG(s.savingG) }}
        </span>
      </li>
    </ul>

    <div v-else class="px-4 py-8 text-center text-sm text-muted">
      No shifts logged yet.
    </div>
  </UCard>
</template>
