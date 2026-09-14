<script setup lang="ts">
const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

// Google Search Console domain verification (set NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION).
const siteVerification = useRuntimeConfig().public.googleSiteVerification

// Canonical origin (NUXT_PUBLIC_SITE_URL) — used for canonical + OpenGraph URLs so they
// don't depend on the request host. Trailing slash trimmed; falls back to the request
// origin when unset.
const route = useRoute()
const requestUrl = useRequestURL()
const siteUrl = (useRuntimeConfig().public.siteUrl || requestUrl.origin).replace(/\/$/, '')
const canonicalUrl = computed(() => siteUrl + route.path)

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color },
    ...(siteVerification ? [{ name: 'google-site-verification', content: siteVerification }] : []),
    // PWA / installable web app (enables iOS 16.4+ Home Screen install + web push).
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'Hiilivahti' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { key: 'canonical', rel: 'canonical', href: canonicalUrl }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Hiilivahti — Low Carbon Alerts'
const description = 'A full-stack web app that tracks Finland\'s real-time electricity grid carbon intensity and notifies users when clean energy windows open.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonicalUrl,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
