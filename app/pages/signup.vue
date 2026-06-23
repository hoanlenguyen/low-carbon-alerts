<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  password: undefined
})

const error = ref('')
const loading = ref(false)
const { fetch: refreshSession } = useUserSession()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/signup', { method: 'POST', body: event.data })
    await refreshSession()
    await navigateTo('/portal')
  } catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err?.data?.statusMessage || 'Could not create account'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">
        Create your account
      </h1>
      <p class="text-sm text-muted">
        Sign up to view your personal dashboard
      </p>
    </template>

    <div class="space-y-4">
      <UButton
        to="/api/auth/google"
        external
        block
        color="neutral"
        variant="subtle"
        icon="i-simple-icons-google"
      >
        Continue with Google
      </UButton>

      <div class="flex items-center gap-2 text-xs text-muted">
        <USeparator />
        <span>or</span>
        <USeparator />
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" autocomplete="name" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            class="w-full"
            autocomplete="username"
          />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput
            v-model="state.password"
            type="password"
            class="w-full"
            autocomplete="new-password"
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

      <p class="text-sm text-center text-muted">
        Already have an account?
        <ULink to="/portal-login" class="text-primary">Log in</ULink>
      </p>
    </div>
  </UCard>
</template>
