<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { user } = useUserSession()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold">
        Welcome, {{ user?.name || user?.email }}
      </h1>
      <p class="text-sm text-muted">
        Here's a read-only overview of your account.
      </p>
    </div>

    <UPageCard title="Profile" icon="i-lucide-user">
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-muted">
            Name
          </dt>
          <dd class="font-medium">
            {{ user?.name || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            Email
          </dt>
          <dd class="font-medium">
            {{ user?.email }}
          </dd>
        </div>
      </dl>
    </UPageCard>
  </div>
</template>
