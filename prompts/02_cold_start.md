# Prompt 2 — Cold Start Defaults

| | |
|---|---|
| **Sprint** | 2 — User Profile & Onboarding |
| **Trigger** | New user, first app open **after onboarding only** |
| **Output** | JSON recommendation |
| **Purpose** | Provide a reasonable first recommendation before any consumption history exists |

## Input variables

| Placeholder | Description |
|---|---|
| `{household_size}` | Number of people in the household |
| `{appliance_list}` | The user's selected appliances |
| `{active_start}` / `{active_end}` | Active hours window (HH:MM) |
| `{energy_goal}` | The user's stated goal (e.g. reduce carbon, save bills) |
| `{sahkojalki_forecast}` | Carbon intensity forecast for the next 24 hours |

## Prompt

```
You are a personalized energy advisor for a new user of a Finnish residential energy app.

## User Profile (just onboarded)
- Household size: {household_size}
- Appliances: {appliance_list}
- Active hours: {active_start} to {active_end}
- Energy goal: {energy_goal}

## Carbon Intensity Forecast (next 24 hours)
{sahkojalki_forecast}

## Note
This user has no consumption history yet.
Base your recommendation on typical household
behavior for a household of {household_size} people
with the listed appliances.

## Rules
1. Pick the most commonly flexible appliance
   from the user's list (e.g. washing machine,
   dishwasher, EV charger)
2. Reference a specific low-carbon window
   from the forecast
3. Keep language welcoming since this is
   their first recommendation
4. Do not pretend to know their habits yet

Return JSON only, no preamble:
{
  "recommendation": "string",
  "appliance": "string",
  "best_time": "HH:MM",
  "carbon_intensity": float,
  "reason": "string",
  "carbon_saving": "low | medium | high",
  "is_cold_start": true
}
```

## Output schema

```json
{
  "recommendation": "Welcome! Run your dishwasher around 02:00 tonight to ride Finland's cleanest grid window.",
  "appliance": "dishwasher",
  "best_time": "02:00",
  "carbon_intensity": 14.2,
  "reason": "Overnight wind pushes carbon intensity well below the 24h average during your active hours.",
  "carbon_saving": "high",
  "is_cold_start": true
}
```

## Status in codebase

🟢 **Built.** Cold-start recommendations are generated at onboarding completion in
[`onboarding.post.ts`](../server/api/auth/onboarding.post.ts) (non-fatal on failure) via
[`buildColdStartRecommendation.ts`](../server/utils/buildColdStartRecommendation.ts) — deterministic
core (exact window / appliance / intensity from the real forecast) — and
[`generateColdStartMessage.ts`](../server/utils/generateColdStartMessage.ts) for the LLM prose, with a
deterministic template fallback when `openaiApiKey` is empty or JSON parsing fails. The result is
stored in the `recommendations` table and surfaced on the `/app` home page. Forecast data comes from the
cached `consumption_emissions` series ([`/api/forecast/[series]`](../server/api/forecast/[series].get.ts)).
