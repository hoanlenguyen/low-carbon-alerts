<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'auth'
})

const { user } = useUserSession()
const toast = useToast()

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email')
})

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<ProfileSchema>({
  name: user.value?.name ?? '',
  email: user.value?.email ?? ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  loading.value = true
  try {
    await $fetch('/api/auth/profile', {
      method: 'PATCH',
      body: event.data
    })
    toast.add({
      title: 'Profile updated',
      description: 'Your name and email have been saved.',
      color: 'success'
    })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    const msg = err?.data?.statusMessage ?? 'Failed to save'
    const isConflict = msg === 'Email already in use'
    toast.add({
      title: isConflict ? 'Email already in use' : 'Error',
      description: isConflict ? 'That email belongs to another account. Choose a different one.' : msg,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profile"
      description="Update your name and email address."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Save changes"
        color="neutral"
        type="submit"
        :loading="loading"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="Name"
        description="Will appear on your profile."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.name" autocomplete="off" />
      </UFormField>

      <USeparator />

      <UFormField
        name="email"
        label="Email"
        description="Used to sign in and for notifications."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.email" type="email" autocomplete="off" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
