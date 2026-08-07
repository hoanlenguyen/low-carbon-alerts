# Prompt 9 — Feedback Interpretation

| | |
|---|---|
| **Sprint** | 6 — Feedback Loop & Profile Learning |
| **Trigger** | User responds to a recommendation |
| **Output** | JSON constraint object |
| **Purpose** | Extract preference constraints to improve future recommendations |

## Input variables

| Placeholder | Description |
|---|---|
| `{recommendation}` | The previous recommendation the user is responding to |
| `{user_feedback}` | The user's response — e.g. "I acted on it", "Can't do laundry at night", "I don't have a dishwasher", "Too late for me" |

## Prompt

```
You are a preference learning assistant for an
energy management app.

## Previous Recommendation
{recommendation}

## User Response
{user_feedback}
// Could be: "I acted on it", "Can't do laundry at night",
// "I don't have a dishwasher", "Too late for me", etc.

Extract any preference constraints implied by this response.
If the response is purely positive with no constraints,
set all constraint fields to null.

Return JSON only, no preamble:
{
  "constraint_type": "time | appliance | general | none",
  "description": "string",
  "appliance_to_exclude": "string or null",
  "avoid_hours": {
    "start": "HH:MM or null",
    "end": "HH:MM or null"
  },
  "positive_signal": true | false
}
```

## Output schema

```json
{
  "constraint_type": "time",
  "description": "User cannot run laundry late at night.",
  "appliance_to_exclude": null,
  "avoid_hours": { "start": "22:00", "end": "06:00" },
  "positive_signal": false
}
```

Purely positive feedback ("I acted on it") sets all constraint fields to `null`,
`constraint_type: "none"`, and `positive_signal: true`.

## Status in codebase

🔴 **Not built.** There is no feedback capture UI or storage yet — recommendations are one-way. To
implement, the extracted constraints would be persisted (e.g. an `avoid_hours` / excluded-appliance
list on `user_profiles`) and then honored by [Prompt 5 — Core Recommendation](05_core_recommendation.md)
and [Prompt 6 — Notification Decision](06_notification_decision.md). This closes the learning loop:
feedback → constraints → better future recommendations.
