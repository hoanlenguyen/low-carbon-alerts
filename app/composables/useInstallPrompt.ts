interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Shared PWA-install state, populated by plugins/pwaInstall.client.ts. `canInstall` is
// true only when the browser has offered a native install prompt (Chromium) and the app
// isn't already installed. iOS has no programmatic prompt, so canInstall stays false there
// and callers fall back to the manual Add-to-Home-Screen steps.
export function useInstallPrompt() {
  const deferred = useState<BeforeInstallPromptEvent | null>('pwa-install-event', () => null)
  const installed = useState<boolean>('pwa-installed', () => false)

  const canInstall = computed(() => !!deferred.value && !installed.value)

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const e = deferred.value
    if (!e) return 'unavailable'
    await e.prompt()
    const { outcome } = await e.userChoice
    deferred.value = null // the prompt can only be used once
    if (outcome === 'accepted') installed.value = true
    return outcome
  }

  return { canInstall, installed, promptInstall }
}
