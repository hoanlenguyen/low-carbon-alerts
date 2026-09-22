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

type Invite = {
  id: string
  email: string
  createdAt: number
  expiresAt: number
  expired: boolean
}

type InviteResult = {
  id: string
  email: string
  expiresAt: number
  acceptUrl: string
  emailed: boolean
}

const toast = useToast()

const { data: members } = await useFetch<Member[]>('/api/members', { default: () => [] })
const { data: invites, refresh: refreshInvites } = await useFetch<Invite[]>('/api/admin/invites', { default: () => [] })

const q = ref('')
const filtered = computed(() =>
  members.value.filter(m =>
    !q.value
    || (m.name ?? '').toLowerCase().includes(q.value.toLowerCase())
    || m.email.toLowerCase().includes(q.value.toLowerCase())
  )
)

// ── Invite an admin ──
const inviteEmail = ref('')
const inviting = ref(false)
const inviteError = ref('')

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ title: 'Invite link copied', color: 'success' })
  } catch {
    toast.add({ title: 'Copy failed', description: url, color: 'warning' })
  }
}

function reportResult(res: InviteResult, verb: string) {
  if (res.emailed) {
    toast.add({ title: `Invitation ${verb}`, description: `Sent to ${res.email}.`, color: 'success' })
  } else {
    toast.add({
      title: `Invitation ${verb} (email not sent)`,
      description: 'Email delivery is not configured — copy the link to share it manually.',
      color: 'warning',
      actions: [{ label: 'Copy link', onClick: () => copyLink(res.acceptUrl) }]
    })
  }
}

async function onInvite() {
  inviteError.value = ''
  inviting.value = true
  try {
    const res = await $fetch<InviteResult>('/api/admin/invites', { method: 'POST', body: { email: inviteEmail.value } })
    reportResult(res, 'sent')
    inviteEmail.value = ''
    await refreshInvites()
  } catch (e: unknown) {
    inviteError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not send invitation'
  } finally {
    inviting.value = false
  }
}

const busyId = ref('')

async function onResend(inv: Invite) {
  busyId.value = inv.id
  try {
    const res = await $fetch<InviteResult>(`/api/admin/invites/${inv.id}/resend`, { method: 'POST' })
    reportResult(res, 'resent')
    await refreshInvites()
  } catch (e: unknown) {
    toast.add({ title: 'Could not resend', description: (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '', color: 'error' })
  } finally {
    busyId.value = ''
  }
}

async function onRevoke(inv: Invite) {
  busyId.value = inv.id
  try {
    await $fetch(`/api/admin/invites/${inv.id}/revoke`, { method: 'POST' })
    toast.add({ title: 'Invitation revoked', color: 'neutral' })
    await refreshInvites()
  } catch (e: unknown) {
    toast.add({ title: 'Could not revoke', description: (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '', color: 'error' })
  } finally {
    busyId.value = ''
  }
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="space-y-6">
    <UPageCard
      title="Members"
      description="All registered users and their roles."
      variant="naked"
      orientation="horizontal"
    />

    <!-- Invite an admin -->
    <UPageCard
      title="Invite an admin"
      description="Send an email invitation to create a new admin account."
      variant="subtle"
    >
      <form class="flex flex-col gap-3 sm:flex-row sm:items-start" @submit.prevent="onInvite">
        <UFormField name="email" class="flex-1" :error="inviteError">
          <UInput
            v-model="inviteEmail"
            type="email"
            icon="i-lucide-mail"
            placeholder="name@example.com"
            class="w-full"
            :disabled="inviting"
          />
        </UFormField>
        <UButton
          type="submit"
          :loading="inviting"
          :disabled="!inviteEmail"
          icon="i-lucide-send"
          class="shrink-0"
        >
          Send invite
        </UButton>
      </form>
    </UPageCard>

    <!-- Pending invitations -->
    <UPageCard
      v-if="invites.length"
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            Pending invitations
          </h2>
          <p class="text-sm text-muted">
            Invites that haven't been accepted yet.
          </p>
        </div>
      </template>

      <ul role="list" class="divide-y divide-default">
        <li
          v-for="inv in invites"
          :key="inv.id"
          class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
        >
          <div class="text-sm min-w-0">
            <p class="text-highlighted font-medium truncate">
              {{ inv.email }}
            </p>
            <p class="text-muted text-xs">
              <template v-if="inv.expired">
                Expired {{ fmtDate(inv.expiresAt) }}
              </template>
              <template v-else>
                Expires {{ fmtDate(inv.expiresAt) }}
              </template>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UBadge
              :color="inv.expired ? 'error' : 'warning'"
              variant="subtle"
              size="xs"
            >
              {{ inv.expired ? 'Expired' : 'Pending' }}
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              :loading="busyId === inv.id"
              @click="onResend(inv)"
            >
              Resend
            </UButton>
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              :loading="busyId === inv.id"
              @click="onRevoke(inv)"
            >
              Revoke
            </UButton>
          </div>
        </li>
      </ul>
    </UPageCard>

    <!-- Members list -->
    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <UInput
          v-model="q"
          icon="i-lucide-search"
          placeholder="Search by name or email"
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
