<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const schema = z.object({
  email: z.string().email('Enter a valid email')
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ email: undefined })
const loading = ref(false)
const submitted = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: event.data })
  } catch {
    // Stay generic even on failure — never reveal whether the email exists.
  } finally {
    submitted.value = true
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">
        Forgot your password?
      </h1>
      <p class="text-sm text-muted">
        Enter your email and we'll send you a reset link.
      </p>
    </template>

    <div v-if="submitted" class="space-y-4">
      <UAlert
        color="success"
        variant="subtle"
        icon="i-lucide-mail-check"
        title="Check your email"
        description="If an account exists for that email, we've sent a link to reset your password. The link expires in about an hour."
      />
      <p class="text-sm text-center text-muted">
        <ULink to="/login" class="text-primary">Back to sign in</ULink>
      </p>
    </div>

    <div v-else class="space-y-4">
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
            icon="i-lucide-mail"
            class="w-full"
            autocomplete="email"
            placeholder="name@example.com"
          />
        </UFormField>

        <UButton type="submit" block :loading="loading">
          Send reset link
        </UButton>
      </UForm>

      <p class="text-sm text-center text-muted">
        Remembered it?
        <ULink to="/login" class="text-primary">Back to sign in</ULink>
      </p>
    </div>
  </UCard>
</template>
