import { initializeApp, getApps } from 'firebase/app'
import { getMessaging } from 'firebase/messaging'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId
  }

  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
  const messaging = getMessaging(app)

  return { provide: { firebaseMessaging: messaging } }
})
