<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

type Member = {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'user'
  avatarUrl: string | null
}

const { data: members } = await useFetch<Member[]>('/api/members', { default: () => [] })

const q = ref('')

const filtered = computed(() =>
  members.value.filter(m =>
    !q.value
    || (m.name ?? '').toLowerCase().includes(q.value.toLowerCase())
    || m.email.toLowerCase().includes(q.value.toLowerCase())
  )
)
</script>

<template>
  <div>
    <UPageCard
      title="Members"
      description="All registered users and their roles."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Search by name or email"
          autofocus
          class="w-full"
        />
      </template>

      <ul role="list" class="divide-y divide-default">
        <li
          v-for="member in filtered"
          :key="member.id"
          class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
        >
          <div class="flex items-center gap-3 min-w-0">
            <UAvatar
              :src="member.avatarUrl ?? undefined"
              :alt="member.name ?? member.email"
              size="md"
            />
            <div class="text-sm min-w-0">
              <p class="text-highlighted font-medium truncate">
                {{ member.name || '—' }}
              </p>
              <p class="text-muted truncate">
                {{ member.email }}
              </p>
            </div>
          </div>

          <UBadge
            :color="member.role === 'admin' ? 'primary' : 'neutral'"
            variant="subtle"
            class="capitalize"
          >
            {{ member.role }}
          </UBadge>
        </li>

        <li v-if="filtered.length === 0" class="py-6 text-center text-sm text-muted">
          No members found.
        </li>
      </ul>
    </UPageCard>
  </div>
</template>
