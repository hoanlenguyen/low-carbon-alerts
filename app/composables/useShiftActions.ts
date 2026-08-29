// Shared "I shifted it" state: the user's recent smart-alert action context (loaded
// once, key-deduped) plus confirm/undo helpers. Used by the alerts page and the
// dashboard's Recent Alerts via the <ShiftActionRow> component.
export interface ActionInfo {
  messageId: string
  windowStart: string | null
  windowEnd: string | null
  suggestedApplianceSlug: string | null
  windowMinutes: number | null
  carbonIntensity: number | null
  avg24h: number | null
  actionable: boolean
  actioned: boolean
  applianceSlug: string | null
  estimatedSavingG: number | null
}
export interface ApplianceChoice {
  slug: string
  name: string
  powerKw: number | null
  durationMin: number | null
}
export interface ActionContext {
  applianceChoices: ApplianceChoice[]
  actions: ActionInfo[]
}

export function useShiftActions() {
  const { data: ctx, refresh } = useFetch<ActionContext>('/api/actions/context', {
    key: 'shift-actions-context',
    lazy: true,
    default: () => ({ applianceChoices: [], actions: [] })
  })

  const infoByMsg = computed(() => new Map((ctx.value?.actions ?? []).map(a => [a.messageId, a])))
  const applianceChoices = computed<ApplianceChoice[]>(() => ctx.value?.applianceChoices ?? [])
  const applianceItems = computed(() => applianceChoices.value.map(c => ({ label: c.name, value: c.slug })))

  async function confirmAction(messageId: string, applianceSlug: string, runTimeMin?: number) {
    await $fetch('/api/actions', { method: 'POST', body: { messageId, applianceSlug, runTimeMin } })
    // Impact (key 'impact') powers the dashboard card + achievements — refresh both.
    await Promise.all([refresh(), refreshNuxtData('impact')])
  }

  async function undoAction(messageId: string) {
    await $fetch(`/api/actions/${messageId}`, { method: 'DELETE' })
    await Promise.all([refresh(), refreshNuxtData('impact')])
  }

  function fmtG(g: number) {
    return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`
  }

  return { ctx, refresh, infoByMsg, applianceChoices, applianceItems, confirmAction, undoAction, fmtG }
}
