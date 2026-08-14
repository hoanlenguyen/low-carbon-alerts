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
    setupToken: '',
    cronSecret: '',
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
