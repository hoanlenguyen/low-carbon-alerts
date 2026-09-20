// Captures the browser's PWA install prompt as early as possible. `beforeinstallprompt`
// fires once on load (Chromium: Android/desktop Chrome & Edge) when the app is
// installable; we stash it so an in-app "Install" button can trigger it on demand.
// iOS Safari never fires this event — that path uses the manual Home-Screen steps.
export default defineNuxtPlugin(() => {
  const deferred = useState<Event | null>('pwa-install-event', () => null)
  const installed = useState<boolean>('pwa-installed', () => false)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // stop Chrome's mini-infobar; we drive it from our button
    deferred.value = e
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferred.value = null
  })
})
