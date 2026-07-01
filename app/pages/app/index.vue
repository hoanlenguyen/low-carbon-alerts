<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { user } = useUserSession()
const { messages, unreadCount, markAsRead, init } = useNotifications()

onMounted(init)
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

    <UPageCard icon="i-lucide-bell">
      <template #title>
        Messages
        <UBadge
          v-if="unreadCount > 0"
          :label="String(unreadCount)"
          color="error"
          size="xs"
          class="ml-2"
        />
      </template>

      <div v-if="messages.length === 0" class="text-sm text-muted py-4 text-center">
        No messages yet
      </div>

      <ul v-else class="divide-y divide-default">
        <li
          v-for="msg in messages"
          :key="msg.id"
          class="py-3 flex items-start gap-3 cursor-pointer hover:bg-elevated/30 rounded px-2 transition-colors"
          @click="markAsRead(msg.id)"
        >
          <span
            class="mt-1.5 shrink-0 size-2 rounded-full"
            :class="msg.read ? 'bg-transparent' : 'bg-primary'"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium" :class="{ 'text-highlighted': !msg.read }">
              {{ msg.subject }}
            </p>
            <p class="text-sm text-muted mt-0.5">
              {{ msg.body }}
            </p>
            <p class="text-xs text-muted mt-1">
              {{ new Date(msg.createdAt).toLocaleString() }}
            </p>
          </div>
        </li>
      </ul>
    </UPageCard>
  </div>
</template>
