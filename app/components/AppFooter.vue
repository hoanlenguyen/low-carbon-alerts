<script setup lang="ts">
// Shared site footer for the public pages (landing, privacy, terms).
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-default">
    <div class="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
      <span>© {{ year }} Hiilivahti</span>
      <div class="flex items-center gap-4">
        <NuxtLink to="/" class="hover:text-highlighted transition-colors">
          Home
        </NuxtLink>
        <NuxtLink to="/privacy" class="hover:text-highlighted transition-colors">
          Privacy
        </NuxtLink>
        <NuxtLink to="/terms" class="hover:text-highlighted transition-colors">
          Terms
        </NuxtLink>
      </div>
    </div>
  </footer>
</template>
