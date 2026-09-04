<script setup lang="ts">
// Forecast carbon intensity by hour (gCO₂/kWh), colour-banded clean→dirty, with a
// "Tomorrow" divider where the horizon crosses midnight. Wrapping flexbox so it reflows
// to any width. Shared by the schedule page (standalone) and the schedule editor.
const { hourOptions } = useEmissionsForecast()

const fmtCarbon = (n: number) => String(Number(n.toFixed(2)))
const bandClass: Record<'clean' | 'mid' | 'dirty', string> = {
  clean: 'text-success', mid: 'text-warning', dirty: 'text-error'
}
</script>

<template>
  <div v-if="hourOptions.length">
    <div class="flex flex-wrap items-end gap-1">
      <template v-for="(h, i) in hourOptions" :key="h.startMs">
        <div
          v-if="h.isTomorrow && (i === 0 || !hourOptions[i - 1]?.isTomorrow)"
          class="w-full text-[10px] font-medium text-dimmed uppercase tracking-wide mt-1">
          Tomorrow
        </div>
        <div
          class="flex flex-col items-center rounded px-1.5 py-1 w-11 shrink-0 text-center"
          :class="h.band === 'clean' ? 'bg-success/10' : h.band === 'dirty' ? 'bg-error/10' : 'bg-warning/10'">
          <span class="text-[10px] text-dimmed">{{ h.label }}</span>
          <span class="text-[11px] font-medium" :class="bandClass[h.band]">{{ fmtCarbon(h.intensity) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
