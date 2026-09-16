<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const toast = useToast()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

// Validate the token up front so we can show a clear error state instead of a dead form.
const { error: verifyError, pending } = await useAsyncData(
  'reset-verify',
  () => (token.value ? $fetch('/api/auth/reset-password', { query: { token: token.value } }) : Promise.reject(new Error('missing'))),
  { server: false }
)

const invalidMessage = computed(() => {
  if (!token.value) return 'This reset link is missing its token.'
  const e = verifyError.value as { data?: { statusMessage?: string } } | null
  if (e) return e.data?.statusMessage ?? 'This reset link is no longer valid.'
  return ''
})

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(1, 'Required')
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ password: undefined, confirmPassword: undefined })
const error = ref('')
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ role: 'admin' | 'user' }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: event.data.password }
    })
    toast.add({ title: 'Password updated', description: 'You can now sign in.', color: 'success' })
    await navigateTo(res.role === 'admin' ? '/admin-login' : '/login')
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Could not reset your password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">
        Choose a new password
      </h1>
      <p class="text-sm text-muted">
        Set a new password for your Hiilivahti account.
      </p>
    </template>

    <div v-if="pending" class="py-6 text-center text-sm text-muted">
      Checking your reset link…
    </div>

    <div v-else-if="invalidMessage" class="space-y-4">
      <UAlert
        color="error"
        variant="subtle"
        title="Reset link not valid"
        :description="invalidMessage"
      />
      <p class="text-sm text-center text-muted">
        <ULink to="/forgot-password" class="text-primary">Request a new link</ULink>
      </p>
    </div>

    <UForm
      v-else
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField label="New password" name="password">
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
        Reset password
      </UButton>
    </UForm>
  </UCard>
</template>
