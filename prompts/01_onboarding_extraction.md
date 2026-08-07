# Prompt 1 — Onboarding Extraction

| | |
|---|---|
| **Sprint** | 2 — User Profile & Onboarding |
| **Trigger** | User completes the onboarding questionnaire |
| **Output** | JSON profile |
| **Purpose** | Parse raw user input into a clean, structured profile stored in the database |

## Input variables

| Placeholder | Description |
|---|---|
| `{raw_user_input}` | The user's free-text / raw answers from onboarding |

## Prompt

```
You are a data extraction assistant for an energy management app.

## User Input
{raw_user_input}

Extract the following fields exactly as described.
If a field is not mentioned, set it to null.
Return JSON only, no preamble:
{
  "household_size": integer,
  "appliances": ["string"],
  "active_hours": {
    "start": "HH:MM",
    "end": "HH:MM"
  },
  "energy_goals": "string",
  "preferred_notification_times": ["HH:MM"]
}
```

## Output schema

```json
{
  "household_size": 3,
  "appliances": ["washing machine", "dishwasher", "EV charger"],
  "active_hours": { "start": "07:00", "end": "23:00" },
  "energy_goals": "reduce carbon footprint",
  "preferred_notification_times": ["08:00", "18:00"]
}
```

## Status in codebase

⚠️ **Approach differs.** Onboarding is currently a **structured multi-step form**
([`app/pages/app/onboarding.vue`](../app/pages/app/onboarding.vue)) that already emits typed
fields (`householdSize`, `appliances[]`, `activeHoursStart/End`, `energyGoal`, …) straight to
[`server/api/auth/onboarding.post.ts`](../server/api/auth/onboarding.post.ts), which validates
with Zod and writes to the `user_profiles` table. Because the input is already structured, this
extraction prompt is **not needed as-is**. It becomes relevant only if onboarding later accepts
natural-language input (e.g. a chat-style setup). Note the current profile captures more than the
spec fields (`housingType`, `primaryHeating`, `contractType`, `peakTimes`, `followsPrices`,
`notifStyle`).
