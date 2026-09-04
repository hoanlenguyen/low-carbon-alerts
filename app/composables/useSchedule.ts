// The user's Appliance Schedule for today: the shifted runs, appliance choices for the
// picker, and which of today's smart-alert messages have a suggested appliance. Loaded
// once (key-deduped) and shared by the /app/schedule page and the per-message gateway
// (<ShiftActionRow>). An appliance may appear several times in a day.
export interface ScheduleEntry {
  id: string
  applianceSlug: string
  startAtMs: number
  runTimeMin: number
  carbonAtStart: number | null
  estimatedSavingG: number
}
export interface ApplianceChoice {
  slug: string
  name: string
  powerKw: number | null
  durationMin: number | null
}
export interface MessageSuggestion {
  messageId: string
  suggestedApplianceSlug: string | null
}
export interface ScheduleData {
  day: string
  isToday: boolean
  entries: ScheduleEntry[]
  totalSavingG: number
  applianceChoices: ApplianceChoice[]
  messages: MessageSuggestion[]
}

// One run the user is scheduling.
export interface SchedulePick {
  applianceSlug: string
  startAtMs: number
  runTimeMin: number
}

const EMPTY: ScheduleData = { day: '', isToday: true, entries: [], totalSavingG: 0, applianceChoices: [], messages: [] }

export function useSchedule() {
  const { data, refresh, status } = useFetch<ScheduleData>('/api/schedule', {
    key: 'appliance-schedule',
    server: false, // authed route; avoid the SSR 401 → client-only fetch
    lazy: true,
    dedupe: 'defer', // shared across the page + every message gateway; reuse in-flight
    default: () => ({ ...EMPTY })
  })

  const entries = computed<ScheduleEntry[]>(() => data.value?.entries ?? [])
  const totalG = computed(() => data.value?.totalSavingG ?? 0)
  const hasToday = computed(() => entries.value.length > 0)
  const applianceChoices = computed<ApplianceChoice[]>(() => data.value?.applianceChoices ?? [])
  const applianceItems = computed(() => applianceChoices.value.map(c => ({
    label: c.powerKw != null ? `${c.name} · ${c.powerKw} kW` : c.name,
    value: c.slug
  })))
  // messageId → suggested appliance slug, for the smart-alert gateway on today's messages.
  const suggestionByMsg = computed(() => new Map((data.value?.messages ?? []).map(m => [m.messageId, m.suggestedApplianceSlug])))

  async function saveSchedule(picks: SchedulePick[]) {
    await $fetch('/api/schedule', { method: 'POST', body: { appliances: picks } })
    await Promise.all([refresh(), refreshNuxtData('impact'), refreshNuxtData('impact-community')])
  }
  async function clearSchedule() {
    await $fetch('/api/schedule', { method: 'DELETE' })
    await Promise.all([refresh(), refreshNuxtData('impact'), refreshNuxtData('impact-community')])
  }

  function fmtG(g: number) {
    return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`
  }

  return {
    data, refresh, status,
    entries, totalG, hasToday, applianceChoices, applianceItems, suggestionByMsg,
    saveSchedule, clearSchedule, fmtG
  }
}
