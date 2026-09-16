<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const toast = useToast()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

// Validate the token up front so we can show the invited email (and a clear error state).
const { data: invite, error: verifyError, pending } = await useAsyncData(
  'invite-verify',
  () => (token.value ? $fetch<{ email: string }>('/api/invites/verify', { query: { token: token.value } }) : Promise.resolve(null)),
  { server: false }
)

const invalidMessage = computed(() => {
  if (!token.value) return 'This invitation link is missing its token.'
  const e = verifyError.value as { data?: { statusMessage?: string } } | null
  if (e) return e.data?.statusMessage ?? 'This invitation is no longer valid.'
  return ''
})

const schema = z.object({
  userName: z.string().min(3, 'Username must be at least 3 characters').max(60),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(1, 'Required')
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  userName: undefined,
  name: undefined,
  password: undefined,
  confirmPassword: undefined
})

const error = ref('')
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/invites/accept', {
      method: 'POST',
      body: {
        token: token.value,
        userName: event.data.userName,
        name: event.data.name,
        password: event.data.password
      }
    })
    toast.add({ title: 'Account created', description: 'You can now sign in.', color: 'success' })
    await navigateTo('/admin-login')
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not create your account'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">
        Accept admin invitation
      </h1>
      <p class="text-sm text-muted">
        Set up your Hiilivahti admin account.
      </p>
    </template>

    <div v-if="pending" class="py-6 text-center text-sm text-muted">
      Checking your invitation…
    </div>

    <UAlert
      v-else-if="invalidMessage"
      color="error"
      variant="subtle"
      title="Invitation not valid"
      :description="invalidMessage"
    />

    <div v-else class="space-y-4">
      <UFormField label="Email">
        <UInput :model-value="invite?.email" class="w-full" disabled />
      </UFormField>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Username" name="userName">
          <UInput
            v-model="state.userName"
            class="w-full"
            autocomplete="username"
            placeholder="Choose a username"
          />
        </UFormField>

        <UFormField label="Name" name="name">
          <UInput
            v-model="state.name"
            class="w-full"
            autocomplete="name"
            placeholder="Your name"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            autocomplete="new-password"
            placeholder="At least 8 characters"
          />
        </UFormField>

        <UFormField label="Confirm password" name="confirmPassword">
          <UInput
            v-model="state.confirmPassword"
            type="password"
            class="w-full"
            autocomplete="new-password"
            placeholder="Repeat password"
          />
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :title="error"
        />

        <UButton type="submit" block :loading="loading">
          Create account
        </UButton>
      </UForm>
    </div>
  </UCard>
</template>
