<script setup lang="ts">
// Platform-aware "enable notifications" tip, shown under the recommendation.
// iOS Safari can't prompt for push in a normal tab — the site must be added to
// the Home Screen first — so we detect the platform and adapt the guidance.
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
        <template v-else-if="needsInstall">
          <p class="text-sm text-muted mt-1 leading-relaxed">
            On iPhone/iPad, add the app to your Home Screen first, then enable notifications from there:
          </p>
          <ol class="text-sm text-muted mt-1.5 list-decimal pl-5 space-y-0.5">
            <li>Tap the <strong>Share</strong> icon in Safari</li>
            <li>Choose <strong>Add to Home Screen</strong></li>
            <li>Open the installed app icon, then return here to enable</li>
          </ol>
        </template>

        <!-- Android -->
        <p v-else-if="platform === 'android'" class="text-sm text-muted mt-1 leading-relaxed">
          Tap <strong>Enable</strong>, then <strong>Allow</strong>. You can also install the app from your
          browser menu (“Install app”) for a home-screen icon.
        </p>

        <!-- Desktop / installed iOS -->
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

        <p class="text-xs text-dimmed mt-3">
          You can turn notifications on or off anytime in
          <NuxtLink to="/app/settings" class="text-primary hover:underline">Settings → Push notifications</NuxtLink>.
        </p>
      </div>
    </div>
  </UPageCard>
</template>
