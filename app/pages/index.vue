<script setup lang="ts">
definePageMeta({ layout: false })

const { loggedIn, user } = useUserSession()

// Signed-in users go straight to their area; signed-out users see the public
// landing page below (must be reachable without login for Google OAuth verification).
if (loggedIn.value) {
  await navigateTo(user.value?.role === 'admin' ? '/admin' : '/app')
}

const features = [
  {
    icon: 'i-lucide-activity',
    title: 'Real-time grid carbon',
    text: 'Tracks Finland’s live electricity-grid carbon intensity, updated continuously.'
  },
  {
    icon: 'i-lucide-bell-ring',
    title: 'Clean-energy alerts',
    text: 'Notifies you when a low-carbon window opens, so you can run appliances at the greenest time.'
  },
  {
    icon: 'i-lucide-leaf',
    title: 'Personal recommendations',
    text: 'Tailors tips to your home and habits to help you cut emissions and shift usage.'
  }
]
</script>

<template>
  <div class="min-h-screen bg-default text-default flex flex-col">
    <!-- Header -->
    <header class="max-w-5xl w-full mx-auto px-4 py-5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img
          src="/android-chrome-192x192.png"
          alt="Hiilivahti"
          width="28"
          height="28"
          class="size-7 rounded-md">
        <span class="font-semibold text-highlighted">Hiilivahti</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          to="/login"
          color="neutral"
          variant="ghost"
          label="Log in" />
        <UButton to="/signup" color="primary" label="Sign up" />
      </div>
    </header>

    <!-- Hero -->
    <main class="flex-1">
      <section class="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-highlighted">
          Hiilivahti — Low Carbon Alerts
        </h1>
        <p class="mt-5 text-lg text-muted leading-relaxed">
          Hiilivahti tracks Finland’s real-time electricity-grid carbon intensity and
          tells you when clean-energy windows open — so you can run your appliances when the
          grid is greenest and cut your carbon footprint.
        </p>
        <div class="mt-8 flex items-center justify-center gap-3">
          <UButton
            to="/signup"
            size="lg"
            color="primary"
            label="Get started" />
          <UButton
            to="/login"
            size="lg"
            color="neutral"
            variant="subtle"
            label="Log in" />
        </div>
      </section>

      <!-- Features -->
      <section class="max-w-5xl mx-auto px-4 pb-16">
        <div class="grid gap-6 sm:grid-cols-3">
          <div
            v-for="f in features"
            :key="f.title"
            class="rounded-xl border border-default bg-elevated/30 p-5"
          >
            <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UIcon :name="f.icon" class="size-5 text-primary" />
            </div>
            <h3 class="mt-4 font-semibold text-highlighted">
              {{ f.title }}
            </h3>
            <p class="mt-1.5 text-sm text-muted leading-relaxed">
              {{ f.text }}
            </p>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>
