<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const toast = useToast()

const passwordSchema = z.object({
  current: z.string().min(1, 'Required'),
  new: z.string().min(8, 'At least 8 characters'),
  confirm: z.string().min(1, 'Required')
}).refine(d => d.new === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm']
}).refine(d => d.current !== d.new, {
  message: 'New password must differ from current',
  path: ['new']
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive({ current: '', new: '', confirm: '' })
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<PasswordSchema>) {
  loading.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'PATCH',
      body: { currentPassword: event.data.current, newPassword: event.data.new }
    })
    toast.add({ title: 'Password updated', color: 'success' })
    Object.assign(password, { current: '', new: '', confirm: '' })
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to update password'
    toast.add({ title: 'Error', description: msg, color: 'error' })
  } finally {
    loading.value = false
  }
}

const confirmDelete = ref(false)
</script>

<template>
  <div class="space-y-8">
    <!-- Password -->
    <div>
      <UPageCard
        title="Change password"
        description="Confirm your current password before setting a new one."
        variant="naked"
        class="mb-4"
      />

      <UPageCard variant="subtle">
        <UForm
          :schema="passwordSchema"
          :state="password"
          class="space-y-4 max-w-sm"
          @submit="onSubmit"
        >
          <UFormField name="current" label="Current password">
            <UInput
              v-model="password.current"
              type="password"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

          <UFormField name="new" label="New password">
            <UInput
              v-model="password.new"
              type="password"
              placeholder="At least 8 characters"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>

          <UFormField name="confirm" label="Confirm new password">
            <UInput
              v-model="password.confirm"
              type="password"
              placeholder="Repeat new password"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>

          <UButton type="submit" color="neutral" :loading="loading">
            Update password
          </UButton>
        </UForm>
      </UPageCard>
    </div>

    <!-- Confirm delete modal -->
    <UModal
      v-model:open="confirmDelete"
      title="Delete account"
      description="Are you absolutely sure? This action cannot be reversed."
    >
      <template #body>
        <p class="text-sm text-muted">
          Your account and all associated data will be permanently deleted. There is no way to recover this.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="confirmDelete = false">
            Cancel
          </UButton>
          <UButton color="error">
            Yes, delete my account
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
