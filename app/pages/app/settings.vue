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
const colorMode = useColorMode()

const appearances = [
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
  { value: 'system', label: 'System', icon: 'i-lucide-monitor' }
] as const

// ── Profile ──
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.union([
    z.literal(''),
    z.string().email('Invalid email address')
  ]),
  userName: z.string()
})
type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<ProfileSchema>({
  name: user.value?.name ?? '',
  email: user.value?.email ?? '',
  userName: user.value?.userName ?? ''
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

// ── Change password ──
const isGoogleUser = computed(() => !user.value?.email || user.value?.avatarUrl?.includes('googleusercontent'))

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(1, 'Required')
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})
type PasswordSchema = z.output<typeof passwordSchema>

const passwordState = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordLoading = ref(false)

async function onChangePassword(event: FormSubmitEvent<PasswordSchema>) {
  passwordLoading.value = true
  try {
    await $fetch('/api/auth/change-password', { method: 'PATCH', body: { currentPassword: event.data.currentPassword, newPassword: event.data.newPassword } })
    toast.add({ title: 'Password updated', color: 'success' })
    Object.assign(passwordState, { currentPassword: '', newPassword: '', confirmPassword: '' })
  } catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to update password'
    toast.add({ title: 'Error', description: msg, color: 'error' })
  } finally {
    passwordLoading.value = false
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

// ── Weekly email summary ──
const hasEmail = computed(() => !!user.value?.email)
const weeklyOptIn = ref(true)
const weeklyLoading = ref(false)

const { data: profileData } = useFetch<{ weeklyEmailOptIn?: boolean } | null>('/api/user/profile', {
  server: false,
  default: () => null
})
watch(profileData, (p) => {
  if (p && typeof p.weeklyEmailOptIn === 'boolean') weeklyOptIn.value = p.weeklyEmailOptIn
}, { immediate: true })

async function onToggleWeekly(value: boolean) {
  weeklyLoading.value = true
  try {
    await $fetch('/api/user/email-prefs', { method: 'PATCH', body: { weeklyEmailOptIn: value } })
    weeklyOptIn.value = value
    toast.add({ title: value ? 'Weekly summary on' : 'Weekly summary off', color: value ? 'success' : 'neutral' })
  } catch {
    weeklyOptIn.value = !value // revert on failure
    toast.add({ title: 'Could not update preference', color: 'error' })
  } finally {
    weeklyLoading.value = false
  }
}
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
          Update your display name and email.
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
          <UFormField name="name" label="Username">
            <UInput
              v-model="profile.userName"
              placeholder="Your username"
              class="w-full"
              disabled
            />
          </UFormField>

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

    <!-- Appearance -->
    <section>
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Appearance
        </h2>
        <p class="text-sm text-muted">
          Choose your preferred color theme.
        </p>
      </div>

      <UPageCard variant="subtle">
        <div class="flex gap-3">
          <button
            v-for="opt in appearances"
            :key="opt.value"
            class="flex flex-1 flex-col items-center gap-2 rounded-lg border px-4 py-3 text-xs font-medium transition-all"
            :class="colorMode.preference === opt.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-default bg-elevated text-muted hover:text-highlighted hover:border-muted'"
            @click="colorMode.preference = opt.value"
          >
            <UIcon :name="opt.icon" class="size-5" />
            {{ opt.label }}
          </button>
        </div>
      </UPageCard>
    </section>

    <!-- Change password -->
    <section>
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Password
        </h2>
        <p class="text-sm text-muted">
          Update your account password.
        </p>
      </div>

      <UPageCard variant="subtle">
        <div v-if="isGoogleUser" class="flex items-center gap-3 text-sm text-muted">
          <UIcon name="i-lucide-info" class="size-4 shrink-0" />
          This account uses Google sign-in — no password to change.
        </div>

        <UForm
          v-else
          id="password-form"
          :schema="passwordSchema"
          :state="passwordState"
          class="space-y-4"
          @submit="onChangePassword"
        >
          <UFormField name="currentPassword" label="Current password">
            <UInput
              v-model="passwordState.currentPassword"
              type="password"
              placeholder="Current password"
              class="w-full"
              autocomplete="current-password"
            />
          </UFormField>

          <UFormField name="newPassword" label="New password">
            <UInput
              v-model="passwordState.newPassword"
              type="password"
              placeholder="At least 8 characters"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>

          <UFormField name="confirmPassword" label="Confirm new password">
            <UInput
              v-model="passwordState.confirmPassword"
              type="password"
              placeholder="Repeat new password"
              class="w-full"
              autocomplete="new-password"
            />
          </UFormField>

          <div class="flex justify-end">
            <UButton type="submit" :loading="passwordLoading">
              Update password
            </UButton>
          </div>
        </UForm>
      </UPageCard>
    </section>

    <!-- Weekly email summary -->
    <section>
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">
          Email
        </h2>
        <p class="text-sm text-muted">
          A weekly summary of your impact and the cleanest hours ahead.
        </p>
      </div>

      <UPageCard variant="subtle">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="size-4 shrink-0" :class="weeklyOptIn && hasEmail ? 'text-primary' : 'text-dimmed'" />
              <span class="text-sm font-medium text-highlighted">Weekly summary email</span>
            </div>
            <p v-if="hasEmail" class="text-xs text-muted">
              Sent every Monday morning to <strong>{{ user?.email }}</strong>.
            </p>
            <p v-else class="text-xs text-warning">
              Add an email to your profile above to receive the weekly summary.
            </p>
          </div>
          <USwitch
            :model-value="weeklyOptIn"
            :disabled="!hasEmail || weeklyLoading"
            @update:model-value="onToggleWeekly"
          />
        </div>
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

      <!-- Platform-aware enable + Add-to-Home-Screen guidance (install steps stay visible) -->
      <NotificationTip class="mt-4" persist-install />
    </section>
  </div>
</template>
