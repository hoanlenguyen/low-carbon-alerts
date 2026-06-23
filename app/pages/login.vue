<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined
})

const error = ref('')
const loading = ref(false)
const { fetch: refreshSession, clear } = useUserSession()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    if (res.role !== 'admin') {
      await clear()
      error.value = 'This account does not have admin access'
      return
    }
    await refreshSession()
    await navigateTo('/admin')
  } catch {
    error.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">
        Admin login
      </h1>
      <p class="text-sm text-muted">
        Sign in with your administrator account
      </p>
    </template>

    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
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
          autocomplete="current-password"
        />
      </UFormField>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="error"
      />

      <UButton type="submit" block :loading="loading">
        Sign in
      </UButton>
    </UForm>
  </UCard>
</template>
