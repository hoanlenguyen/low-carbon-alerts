<script setup lang="ts">
// General daily electricity-forecast for the next 24h — same for all consumers,
// generated once per day server-side (see /api/daily-forecast).
const { data, status } = await useFetch('/api/daily-forecast', { lazy: true })
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-cloud-sun" class="size-4 text-primary shrink-0" />
        <span class="font-semibold text-sm text-highlighted">Forecast · next 24h</span>
      </div>
    </template>

    <div v-if="status === 'pending'" class="space-y-2">
      <div class="h-4 rounded bg-elevated/50 animate-pulse" />
      <div class="h-4 w-5/6 rounded bg-elevated/50 animate-pulse" />
      <div class="h-4 w-2/3 rounded bg-elevated/50 animate-pulse" />
    </div>

    <p v-else-if="data?.body" class="text-sm text-muted leading-relaxed whitespace-pre-wrap">
      {{ data.body }}
    </p>

    <p v-else class="text-sm text-muted">
      Forecast is unavailable right now.
    </p>
  </UPageCard>
</template>
