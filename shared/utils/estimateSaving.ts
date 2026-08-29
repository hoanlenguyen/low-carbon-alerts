// Deterministic estimate of CO2 avoided by shifting one appliance run into a clean
// window: energy (kWh) × the carbon-intensity drop vs the 24h average (gCO2/kWh).
// Everything is labelled "estimated" in the UI — this models, it doesn't meter.

// Fallbacks for appliances with no catalog power/duration (a generic ~2.25 kWh load).
const DEFAULT_POWER_KW = 1.5
const DEFAULT_DURATION_MIN = 90

export function estimateSavingG(
  powerKw: number | null | undefined,
  durationMin: number | null | undefined,
  avg24h: number | null | undefined,
  windowIntensity: number | null | undefined,
  windowMinutes?: number | null // clean-window length; caps the credited run time
): number {
  if (avg24h == null || windowIntensity == null) return 0
  let mins = durationMin ?? DEFAULT_DURATION_MIN
  // Only the portion of the run that fits inside the clean window earns the saving.
  if (windowMinutes != null && windowMinutes > 0) mins = Math.min(mins, windowMinutes)
  const kwh = (powerKw ?? DEFAULT_POWER_KW) * (mins / 60)
  const deltaG = Math.max(0, avg24h - windowIntensity) // never negative
  return Math.round(kwh * deltaG)
}
