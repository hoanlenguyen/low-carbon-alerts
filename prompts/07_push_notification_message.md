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
| `{appliance_options}` | The user's time-shiftable appliances (comma-separated); the model picks the best fit for the window |
| `{window_start}` / `{window_end}` | Best window (HH:MM) |
| `{carbon_intensity}` | Carbon intensity during the window, gCO₂/kWh |
| `{avg_24h}` | Next-24h average grid intensity, gCO₂/kWh (data-rich lead line) |
| `{urgency}` | `low` / `medium` / `high` |

## Notification style

The message adapts to the user's `notifStyle` preference (set during onboarding, stored on
`user_profiles.notif_style`). Two template variants are selected at generation time:

- **`simple`** ("Simple & plain") — friendly, motivational, **no numbers**.
- **`detailed`** ("Data-rich") — informative and factual, **includes the carbon figures**.

## Appliance selection (hybrid)

Code narrows the user's appliances to their **time-shiftable** ones (`flexibleAppliances`) and passes
that shortlist as `{appliance_options}`. The **LLM picks the single best fit for the window** and
recommends only that one — never inventing an appliance outside the list. The deterministic fallback
(no LLM key) uses the top-priority appliance the user owns.

## Prompt — `simple` (Simple & plain)

```
You are a friendly energy assistant writing a mobile push notification for a Finnish energy app.

## Context
- User name: {name}
- The user's time-shiftable appliances: {appliance_options}
- Best window: {window_start} to {window_end}
- Carbon intensity during window: {carbon_intensity} gCO2/kWh
- Urgency: {urgency}

## Rules
1. Maximum 120 characters including spaces
2. Choose ONE appliance from the list above that best fits the {window_start}-{window_end} window, and mention only that one — never invent an appliance not on the list
3. Mention the time window
4. If urgency is high, add a light sense of excitement
5. Friendly tone, no technical jargon
6. Do not start with "Hey" or "Hi"
7. Do not include carbon intensity numbers
8. Return plain text only, no JSON, no quotes

Example good output:
"Great wind tonight! Run your washing machine after 22:00 for a clean green load."
```

## Prompt — `detailed` (Data-rich)

```
You are writing a data-rich mobile push notification for a Finnish energy app.
The user prefers informative, number-led notifications with real detail — not a one-liner.

## Context
- User name: {name}
- The user's time-shiftable appliances: {appliance_options}
- Cleanest window: {window_start} to {window_end}
- Carbon intensity during that window: {carbon_intensity} gCO2/kWh
- Next 24h average grid intensity: {avg_24h} gCO2/kWh
- Urgency: {urgency}

## Rules
1. One or two sentences, AT MOST 160 characters including spaces — the message must be complete, never cut off mid-sentence
2. Choose ONE appliance from the list above that best fits the {window_start}-{window_end} window (longer/overnight windows suit an EV charger or dishwasher; short windows suit a quick load). Recommend only that one — never invent an appliance not on the list
3. Include the window intensity ({carbon_intensity} gCO2/kWh); mention the 24h average ({avg_24h} gCO2/kWh) only if it still fits
4. Factual, informative tone — no greetings, no emojis, no hype; do not address the user by name
5. Return plain text only, no JSON, no quotes

Example good output:
"Cleanest window is 12:00-14:00 at 14 gCO2/kWh, below today's 23 average. Run your dishwasher then to cut its carbon footprint."
```

## Output

Plain text — a single push notification, ≤200 characters, no quotes. Examples:

```
simple:   Great wind tonight! Run your washing machine after 22:00 for a clean green load.
detailed: Cleanest window is 12:00-14:00 at 14 gCO2/kWh, below today's 23 average. Run your dishwasher then to cut its carbon footprint.
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
