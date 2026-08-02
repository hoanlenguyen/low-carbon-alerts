<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'app',
  middleware: 'auth'
})

const { user } = useUserSession()
const { fcmToken, enablePush, disablePush } = useNotifications()
const toast = useToast()

// ── Profile ──
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email')
})
type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<ProfileSchema>({
  name: user.value?.name ?? '',
  email: user.value?.email ?? ''
})
const profileLoading = ref(false)

async function onSaveProfile(event: FormSubmitEvent<ProfileSchema>) {
  profileLoading.value = true
  try {
    await $fetch('/api/auth/profile', { method: 'PATCH', body: event.data })
    toast.add({ title: 'Profile updated', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    const msg = err?.data?.statusMessage ?? 'Failed to save'
    toast.add({
      title: msg === 'Email already in use' ? 'Email already in use' : 'Error',
      description: msg === 'Email already in use' ? 'That email belongs to another account.' : msg,
      color: 'error'
    })
  } finally {
    profileLoading.value = false
  }
}

// ── Push notifications ──
const pushPermission = ref<NotificationPermission>('default')
const pushLoading = ref(false)

onMounted(() => {
  if ('Notification' in window) {
    pushPermission.value = Notification.permission
  }
})

async function onEnablePush() {
  pushLoading.value = true
  try {
    await enablePush()
    pushPermission.value = Notification.permission
    if (fcmToken.value) {
      toast.add({ title: 'Push notifications enabled', color: 'success' })
    } else {
      toast.add({ title: 'Permission denied', description: 'Allow notifications in your browser settings.', color: 'warning' })
    }
  } finally {
    pushLoading.value = false
  }
}

async function onDisablePush() {
  pushLoading.value = true
  try {
    await disablePush()
    toast.add({ title: 'Push notifications disabled', color: 'neutral' })
  } finally {
    pushLoading.value = false
  }
}

const pushEnabled = computed(() => pushPermission.value === 'granted' && !!fcmToken.value)
const pushDenied = computed(() => pushPermission.value === 'denied')
</script>

<template>
  <div class="space-y-8">

    <!-- Page title -->
    <div>
      <h1 class="text-xl font-semibold text-highlighted">
        Settings
      </h1>
      <p class="text-sm text-muted mt-0.5">
        Manage your profile and notification preferences.
      </p>
    </div>

    <!-- Profile -->
    <section>
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Profile
        </h2>
        <p class="text-sm text-muted">
          Update your display name and email address.
        </p>
      </div>

      <UPageCard variant="subtle">
        <UForm
          id="profile-form"
          :schema="profileSchema"
          :state="profile"
          class="space-y-4"
          @submit="onSaveProfile"
        >
          <UFormField name="name" label="Name">
            <UInput
              v-model="profile.name"
              placeholder="Your name"
              class="w-full"
              autocomplete="name"
            />
          </UFormField>

          <UFormField name="email" label="Email">
            <UInput
              v-model="profile.email"
              type="email"
              placeholder="you@example.com"
              class="w-full"
              autocomplete="email"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton type="submit" :loading="profileLoading">
              Save changes
            </UButton>
          </div>
        </UForm>
      </UPageCard>
    </section>

    <!-- Push notifications -->
    <section>
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Push notifications
        </h2>
        <p class="text-sm text-muted">
          Receive alerts directly in your browser when low-carbon windows are detected.
        </p>
      </div>

      <UPageCard variant="subtle">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bell" class="size-4 shrink-0" :class="pushEnabled ? 'text-primary' : 'text-dimmed'" />
              <span class="text-sm font-medium text-highlighted">Browser push</span>
              <UBadge
                v-if="pushEnabled"
                label="Active"
                color="success"
                variant="subtle"
                size="xs"
              />
              <UBadge
                v-else-if="pushDenied"
                label="Blocked"
                color="error"
                variant="subtle"
                size="xs"
              />
              <UBadge
                v-else
                label="Off"
                color="neutral"
                variant="subtle"
                size="xs"
              />
            </div>
            <p v-if="pushEnabled" class="text-xs text-muted">
              You'll receive notifications even when the app is in the background.
            </p>
            <p v-else-if="pushDenied" class="text-xs text-error">
              Notifications are blocked. Enable them in your browser's site settings, then return here.
            </p>
            <p v-else class="text-xs text-muted">
              Enable to get real-time alerts when low-carbon energy windows open.
            </p>
          </div>

          <UButton
            v-if="pushEnabled"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="pushLoading"
            class="shrink-0"
            @click="onDisablePush"
          >
            Disable
          </UButton>
          <UButton
            v-else-if="!pushDenied"
            color="primary"
            size="sm"
            :loading="pushLoading"
            class="shrink-0"
            @click="onEnablePush"
          >
            Enable
          </UButton>
        </div>
      </UPageCard>
    </section>

  </div>
</template>
