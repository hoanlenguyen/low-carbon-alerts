<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

// const route = useRoute()
// const toast = useToast()

const open = ref(false)
const feedbackOpen = ref(false)

// On first visit, default the admin sidebar to collapsed on smaller screens (< xl / 1280px).
// Nuxt UI persists the collapsed state in its own cookie ('dashboard-sidebar-default'), so
// once the admin toggles it manually their choice is remembered and we don't override it.
const nuxtApp = useNuxtApp()
// Dedicated first-visit flag (Nuxt UI writes its own sidebar cookie on init for the panel
// size, so we can't use that to detect a first visit). We apply the width-based default
// exactly once; afterwards Nuxt UI's cookie remembers the admin's manual toggles.
const sidebarDefaulted = useCookie<boolean>('admin-sidebar-defaulted', { default: () => false })
onMounted(() => {
  if (sidebarDefaulted.value) return
  sidebarDefaulted.value = true
  if (window.innerWidth < 1280) {
    nuxtApp.callHook('dashboard:sidebar:collapse', true)
  }
})

const links = [[{
  label: 'Dashboard',
  icon: 'i-lucide-house',
  to: '/admin',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Grid Forecast',
  icon: 'i-lucide-activity',
  to: '/admin/forecast',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Smart Alert',
  icon: 'i-lucide-bot',
  to: '/admin/smart-alert',
  onSelect: () => {
    open.value = false
  }
},
{
  label: 'Notifications',
  icon: 'i-lucide-bell',
  to: '/admin/notifications',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Sent messages',
  icon: 'i-lucide-send',
  to: '/admin/messages',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Energy consumers',
  icon: 'i-lucide-users',
  to: '/admin/consumers',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Appliances',
  icon: 'i-lucide-plug',
  to: '/admin/appliances',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Scheduled jobs',
  icon: 'i-lucide-calendar-clock',
  to: '/admin/scheduled-jobs',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Settings',
  to: '/admin/settings',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'General',
    to: '/admin/settings',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Members',
    to: '/admin/settings/members',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Security',
    to: '/admin/settings/security',
    onSelect: () => {
      open.value = false
    }
  }]
}], [{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  onSelect: () => {
    feedbackOpen.value = true
    open.value = false
  }
}
// , {
//   label: 'Help & Support',
//   icon: 'i-lucide-info',
//   to: 'https://github.com/hoanlenguyen',
//   target: '_blank'
// }
]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat()
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/hoanlenguyen/low-carbon-alerts`,
    target: '_blank'
  }]
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  // toast.add({
  //   title: 'We use first-party cookies to enhance your experience on our website.',
  //   duration: 0,
  //   close: false,
  //   actions: [{
  //     label: 'Accept',
  //     color: 'neutral',
  //     variant: 'outline',
  //     onClick: () => {
  //       cookie.value = 'accepted'
  //     }
  //   }, {
  //     label: 'Opt out',
  //     color: 'neutral',
  //     variant: 'ghost'
  //   }]
  // })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
        <!-- <UTooltip :text="collapsed ? 'Log out' : ''" :delay-duration="0">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-out"
            :label="collapsed ? undefined : 'Log out'"
            :square="collapsed"
            block
            class="text-dimmed hover:text-highlighted"
            aria-label="Log out"
            @click="logout"
          />
        </UTooltip> -->
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
    <FeedbackDialog v-model:open="feedbackOpen" />
  </UDashboardGroup>
</template>
