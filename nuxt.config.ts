// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    'nitro-cloudflare-dev',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'nuxt-auth-utils'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // nuxt-auth-utils session: persistent 1-year cookie so users stay logged in
    // (email + Google both use this) until they explicitly log out. The password
    // comes from NUXT_SESSION_PASSWORD. Without maxAge it defaults to a browser-
    // session cookie that expires on close — the cause of frequent re-logins.
    session: {
      password: '', // filled from NUXT_SESSION_PASSWORD at runtime
      maxAge: 60 * 60 * 24 * 365 // 1 year (seconds)
    },
    setupToken: '',
    cronSecret: '',
    automationSecret: '', // bearer secret for external automation (n8n) endpoints
    fcmServiceAccount: '',
    fcmProjectId: '',
    openaiApiKey: '',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiLlmModel: 'gpt-4o-mini',
    // Gmail API sending (reuses the Google OAuth client id/secret from oauth.google).
    gmailRefreshToken: '',
    emailFrom: 'lowcarbonalertadmin@gmail.com',
    emailFromName: 'Low Carbon Alerts',
    public: {
      // Google Search Console site-verification token (for OAuth domain verification).
      googleSiteVerification: '',
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseMessagingSenderId: '',
      firebaseAppId: '',
      firebaseVapidKey: ''
    }
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    preset: 'cloudflare-pages'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
