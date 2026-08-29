<script setup lang="ts">
// Milestone badges (see useAchievements) — earned ones highlighted, locked ones dimmed.
const { badges, earnedCount, total } = useAchievements()
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-award" class="size-4 text-primary shrink-0" />
          <span class="font-semibold text-sm text-highlighted">Achievements</span>
        </div>
        <span class="text-xs text-muted tabular-nums">{{ earnedCount }} / {{ total }}</span>
      </div>
    </template>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="b in badges"
        :key="b.id"
        class="flex flex-col items-center text-center rounded-lg border p-3 transition"
        :class="b.earned ? BADGE_COLORS[b.color].tile : 'border-default bg-elevated/30'"
      >
        <div
          class="size-10 rounded-full flex items-center justify-center shrink-0"
          :class="b.earned ? BADGE_COLORS[b.color].chip : 'bg-elevated'"
        >
          <UIcon
            :name="b.earned ? b.icon : 'i-lucide-lock'"
            class="size-5"
            :class="b.earned ? BADGE_COLORS[b.color].icon : 'text-dimmed'"
          />
        </div>
        <p class="text-xs font-semibold mt-2" :class="b.earned ? 'text-highlighted' : 'text-muted'">
          {{ b.label }}
        </p>
        <p class="text-[11px] text-dimmed leading-snug mt-0.5">{{ b.desc }}</p>
        <!-- Progress toward a locked badge -->
        <div v-if="!b.earned && b.progress > 0" class="w-full mt-2 h-1 rounded-full bg-elevated overflow-hidden">
          <div class="h-full bg-primary/50 rounded-full" :style="{ width: `${Math.round(b.progress * 100)}%` }" />
        </div>
      </div>
    </div>
  </UPageCard>
</template>
