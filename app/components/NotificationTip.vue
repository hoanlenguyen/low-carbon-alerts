<script setup lang="ts">
// Platform-aware "enable notifications" tip, shown under the recommendation.
// iOS Safari can't prompt for push in a normal tab — the site must be added to
// the Home Screen first — so we detect the platform and adapt the guidance.
// Android can prompt in-tab, but installing still gives an icon + unread badge.
const { enablePush } = useNotifications()

type Platform = 'desktop' | 'android' | 'ios'

const ready = ref(false)
const platform = ref<Platform>('desktop')
const isStandalone = ref(false)
const permission = ref<NotificationPermission | 'unsupported'>('default')
const busy = ref(false)

function detect() {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
  const isAndroid = /Android/.test(ua)
  platform.value = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
  isStandalone.value = window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true
  permission.value = 'Notification' in window ? Notification.permission : 'unsupported'
}

onMounted(() => {
  detect()
  ready.value = true
})

// iOS in a Safari tab (not installed) can't be prompted — needs Home Screen install first.
const needsInstall = computed(() => platform.value === 'ios' && !isStandalone.value)
const canPrompt = computed(() => permission.value === 'default' && !needsInstall.value)
const hidden = computed(() => permission.value === 'granted' || permission.value === 'unsupported')

// Add-to-Home-Screen guidance for mobile, shown whenever the app isn't installed.
const showInstall = computed(() =>
  (platform.value === 'ios' || platform.value === 'android') && !isStandalone.value
)
const installSteps = computed(() => platform.value === 'ios'
  ? [
      'Open this site in Safari',
      'Tap the Share icon (the square with an up arrow)',
      'Choose “Add to Home Screen”',
      'Open the app from its new Home Screen icon'
    ]
  : [
      'Open this site in Chrome',
      'Tap the ⋮ menu (top-right)',
      'Choose “Add to Home screen” (or “Install app”)',
      'Open the app from its new Home Screen icon'
    ]
)
const installNote = computed(() => platform.value === 'ios'
  ? 'Required on iPhone/iPad to receive notifications'
  : 'Optional — adds a home-screen icon with an unread badge'
)

async function enable() {
  busy.value = true
  try {
    await enablePush()
  } finally {
    if ('Notification' in window) permission.value = Notification.permission
    busy.value = false
  }
}
</script>

<template>
  <UPageCard v-if="ready && !hidden" variant="subtle">
    <div class="flex items-start gap-3">
      <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-bell-ring" class="size-4 text-primary" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-highlighted">
          Get low-carbon alerts
        </p>

        <!-- Blocked -->
        <p v-if="permission === 'denied'" class="text-sm text-muted mt-1 leading-relaxed">
          Notifications are blocked. Allow them for this site in your browser settings, then reload.
        </p>

        <!-- iOS, not installed -->
        <p v-else-if="needsInstall" class="text-sm text-muted mt-1 leading-relaxed">
          To get alerts on iPhone/iPad, add the app to your Home Screen, then open it and enable notifications.
        </p>

        <!-- Desktop / Android / installed -->
        <p v-else class="text-sm text-muted mt-1 leading-relaxed">
          Tap <strong>Enable</strong>, then <strong>Allow</strong> in the browser prompt.
        </p>

        <div v-if="canPrompt" class="mt-3">
          <UButton
            size="sm"
            icon="i-lucide-bell"
            :loading="busy"
            @click="enable">
            Enable notifications
          </UButton>
        </div>

        <!-- Add to Home Screen (iPhone / Android) -->
        <div v-if="showInstall" class="mt-3 rounded-lg border border-dashed border-default bg-elevated/30 p-3">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-smartphone" class="size-3.5 text-primary shrink-0" />
            <span class="text-xs font-semibold text-highlighted">Add to your Home Screen</span>
          </div>
          <p class="text-[11px] text-dimmed mt-0.5">
            {{ installNote }}
          </p>
          <ol class="text-xs text-muted mt-2 list-decimal pl-5 space-y-0.5">
            <li v-for="(step, i) in installSteps" :key="i">
              {{ step }}
            </li>
          </ol>
        </div>

        <p class="text-xs text-dimmed mt-3">
          You can turn notifications on or off anytime in
          <NuxtLink to="/app/settings" class="text-primary hover:underline">Settings → Push notifications</NuxtLink>.
        </p>
      </div>
    </div>
  </UPageCard>
</template>
