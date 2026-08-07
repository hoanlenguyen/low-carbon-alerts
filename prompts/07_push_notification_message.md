# Prompt 7 — Push Notification Message

| | |
|---|---|
| **Sprint** | 5 — Notification Delivery Layer |
| **Trigger** | Only when the decision prompt returns `should_notify = true` |
| **Output** | Plain text message |
| **Purpose** | Write a short, personalized, human-sounding push notification |

## Input variables

| Placeholder | Description |
|---|---|
| `{name}` | The user's name |
| `{appliance}` | Recommended appliance (from [Prompt 6](06_notification_decision.md)) |
| `{window_start}` / `{window_end}` | Best window (HH:MM) |
| `{carbon_intensity}` | Carbon intensity during the window, gCO₂/kWh |
| `{urgency}` | `low` / `medium` / `high` |

## Prompt

```
You are a friendly energy assistant writing a mobile
push notification for a Finnish energy app.

## Context
- User name: {name}
- Recommended appliance: {appliance}
- Best window: {window_start} to {window_end}
- Carbon intensity during window: {carbon_intensity} gCO2/kWh
- Urgency: {urgency}

## Rules
1. Maximum 100 characters including spaces
2. Mention the specific appliance and time window
3. If urgency is high, add a light sense of excitement
4. Friendly tone, no technical jargon
5. Do not start with "Hey" or "Hi"
6. Do not include carbon intensity numbers
7. Return plain text only, no JSON, no quotes

Example good output:
"Great wind tonight! Run your washing machine after 22:00 for a clean green load."
```

## Output

Plain text — a single push notification, ≤100 characters, no quotes, no numbers. Example:

```
Great wind tonight! Run your washing machine after 22:00 for a clean green load.
```

## Status in codebase

🟡 **Partial.** [`server/utils/generateAlertMessage.ts`](../server/utils/generateAlertMessage.ts)
is the closest existing analog — it writes a push `{subject, body}` from live grid context and has
the parse-with-fallback pattern. But it diverges from this spec:

- It returns a **subject + body** JSON, whereas this prompt returns a **single plain-text line**.
- It is **grid-context / broadcast** based, not personalized with `{name}`, `{appliance}`, and the
  per-user window from [Prompt 6](06_notification_decision.md).
- It **does** include the carbon-intensity number in the body; this prompt's rule 6 forbids that.
- No ≤100-character limit and no "don't start with Hey/Hi" rule.

Delivery itself (FCM HTTP v1 + SSE) is already implemented in
[`server/utils/sendNotification.ts`](../server/utils/sendNotification.ts).
