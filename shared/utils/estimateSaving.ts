// Deterministic estimate of CO2 avoided by shifting one appliance run into cleaner
// hours: for each hour the run covers, energy (kWh) × the carbon drop vs the 24h
// average (gCO2/kWh), summed. Everything is labelled "estimated" in the UI — this
// models, it doesn't meter.

// Fallback power for appliances with no catalog value.
const DEFAULT_POWER_KW = 1.5

// One clock-hour slice of a run: `hours` = how long the appliance runs inside that
// hour (Σ over slices = total run length), `intensity` = that hour's forecast carbon.
export interface RunHourSlice { hours: number, intensity: number }

// Split a run [startMs, startMs + runMin) into per-clock-hour slices, pairing each
// with its forecast carbon (gCO₂/kWh) from an ascending hourly points list. Hours with
// no forecast point (beyond the horizon) are dropped, so only credited hours remain.
export function runHourSlices(
  startMs: number,
  runMin: number,
  points: { time: number, value: number }[]
): RunHourSlice[] {
  const HOUR = 3_600_000
  const endMs = startMs + runMin * 60_000
  const slices: RunHourSlice[] = []
  // Walk clock-hour buckets aligned to the top of the start hour.
  let bucket = Math.floor(startMs / HOUR) * HOUR
  while (bucket < endMs) {
    const overlap = Math.min(endMs, bucket + HOUR) - Math.max(startMs, bucket)
    if (overlap > 0) {
      // Intensity = the forecast point AT this clock-hour. Hours with no point (past
      // the forecast horizon, or a gap) are dropped — we never credit an unpriced hour.
      const pt = points.find(p => p.time >= bucket && p.time < bucket + HOUR)
      if (pt) slices.push({ hours: overlap / HOUR, intensity: pt.value })
    }
    bucket += HOUR
  }
  return slices
}

// Per-hour saving formula: power × Σ hours_h × (avg24h − intensity_h), total floored
// at 0. A dirtier-than-average hour subtracts from cleaner hours in the same run; only
// the final total is clamped. Also returns the time-weighted average carbon over the
// credited hours (for display/snapshot). Shared by the live preview and the server.
export function estimateSavingHourly(
  powerKw: number | null | undefined,
  avg24h: number | null | undefined,
  slices: RunHourSlice[]
): { savingG: number, carbonAvg: number | null, creditedMin: number } {
  const kw = powerKw ?? DEFAULT_POWER_KW
  const totalHours = slices.reduce((s, x) => s + x.hours, 0)
  const creditedMin = Math.round(totalHours * 60)
  if (avg24h == null || !slices.length) {
    return { savingG: 0, carbonAvg: null, creditedMin }
  }
  const weightedDeltaG = slices.reduce((s, x) => s + x.hours * (avg24h - x.intensity), 0)
  const weightedIntensity = slices.reduce((s, x) => s + x.hours * x.intensity, 0)
  const savingG = Math.max(0, Math.round(kw * weightedDeltaG))
  // Keep the actual carbon level (2-decimal), not rounded up to a whole number.
  const carbonAvg = totalHours > 0 ? Math.round((weightedIntensity / totalHours) * 100) / 100 : null
  return { savingG, carbonAvg, creditedMin }
}
