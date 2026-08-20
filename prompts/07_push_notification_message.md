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

## Notification style

The message adapts to the user's `notifStyle` preference (set during onboarding, stored on
`user_profiles.notif_style`). Two template variants are selected at generation time:

- **`simple`** ("Simple & plain") — friendly, motivational, **no numbers**.
- **`detailed`** ("Data-rich") — terse and factual, **leads with the carbon figure**.

## Prompt — `simple` (Simple & plain)

```
You are a friendly energy assistant writing a mobile push notification for a Finnish energy app.

## Context
- User name: {name}
- Recommended appliance: {appliance}
- Best window: {window_start} to {window_end}
- Carbon intensity during window: {carbon_intensity} gCO2/kWh
- Urgency: {urgency}

## Rules
1. Maximum 120 characters including spaces
2. Mention the specific appliance and time window
3. If urgency is high, add a light sense of excitement
4. Friendly tone, no technical jargon
5. Do not start with "Hey" or "Hi"
6. Do not include carbon intensity numbers
7. Return plain text only, no JSON, no quotes

Example good output:
"Great wind tonight! Run your washing machine after 22:00 for a clean green load."
```

## Prompt — `detailed` (Data-rich)

```
You are writing a concise, data-first mobile push notification for a Finnish energy app.
The user prefers "data-rich" notifications: lead with the number.

## Context
- User name: {name}
- Recommended appliance: {appliance}
- Best window: {window_start} to {window_end}
- Carbon intensity during window: {carbon_intensity} gCO2/kWh
- Urgency: {urgency}

## Rules
1. Maximum 200 characters including spaces
2. Lead with the carbon figure: {carbon_intensity} gCO2/kWh (numbers are expected in this style)
3. State the specific appliance and the time window (e.g. "before {window_end}" or "{window_start}-{window_end}")
4. Terse and factual — no greetings, no emojis, no motivational fluff
5. Do not address the user by name
6. Return plain text only, no JSON, no quotes

Example good output:
"Grid at 23 gCO2/kWh 12:00-14:00. Run your dishwasher before 14:00."
```

## Output

Plain text — a single push notification, ≤200 characters, no quotes. Examples:

```
simple:   Great wind tonight! Run your washing machine after 22:00 for a clean green load.
detailed: Grid at 23 gCO2/kWh 12:00-14:00. Run your dishwasher before 14:00.
```

## Status in codebase

🟢 **Built.** [`server/utils/generatePushMessage.ts`](../server/utils/generatePushMessage.ts) implements
this prompt with a deterministic fallback and a 200-character hard cap. It selects
`push-message-simple` or `push-message-detailed` (in
[`server/prompts/templates.ts`](../server/prompts/templates.ts)) from the user's `notifStyle`.

Callers pass the style through: the hourly smart alert
([`server/utils/runSmartAlert.ts`](../server/utils/runSmartAlert.ts)) uses each recipient's own
`notifStyle`; the admin test and preview endpoints
([`smart-alert-test`](../server/api/admin/notifications/smart-alert-test.post.ts),
[`smart-alert-preview`](../server/api/admin/notifications/smart-alert-preview.post.ts)) use the target
user's style (or default to `detailed` for preview).

Delivery itself (FCM HTTP v1 + SSE) is implemented in
[`server/utils/sendNotification.ts`](../server/utils/sendNotification.ts).
