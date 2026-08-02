<script setup lang="ts">
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const toast = useToast()

const passwordSchema = z.object({
  current: z.string().min(8, 'Must be at least 8 characters'),
  new: z.string().min(8, 'Must be at least 8 characters')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
  current: '',
  new: ''
})

const loading = ref(false)

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  if (state.current && state.new && state.current === state.new) {
    return [{ name: 'new', message: 'New password must differ from current' }]
  }
  return []
}

async function onSubmit(_event: FormSubmitEvent<PasswordSchema>) {
  loading.value = true
  try {
    // TODO: wire to PATCH /api/auth/password when endpoint is ready
    await new Promise(r => setTimeout(r, 600))
    toast.add({ title: 'Password updated', color: 'success' })
    password.current = ''
    password.new = ''
  } catch {
    toast.add({ title: 'Failed to update password', color: 'error' })
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
          :validate="validate"
          class="space-y-4 max-w-sm"
          @submit="onSubmit"
        >
          <UFormField name="current" label="Current password">
            <UInput
              v-model="password.current"
              type="password"
              placeholder="••••••••"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

          <UFormField name="new" label="New password">
            <UInput
              v-model="password.new"
              type="password"
              placeholder="••••••••"
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

    <!-- Danger zone -->
    <div>
      <UPageCard
        title="Danger zone"
        description="Permanent and irreversible actions."
        variant="naked"
        class="mb-4"
      />

      <div class="rounded-xl border border-error/30 bg-error/5 p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-highlighted">
              Delete account
            </p>
            <p class="text-sm text-muted mt-0.5">
              All data associated with this account will be permanently removed. This cannot be undone.
            </p>
          </div>
          <UButton
            color="error"
            variant="subtle"
            class="shrink-0"
            @click="confirmDelete = true"
          >
            Delete account
          </UButton>
        </div>
      </div>
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
