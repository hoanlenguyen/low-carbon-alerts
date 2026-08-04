<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})
</script>

<template>
  <UDashboardPanel id="forecast">
    <template #header>
      <UDashboardNavbar title="Grid Forecast">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <GridForecastCard />
    </template>
  </UDashboardPanel>
</template>
