# Prompt 4 — Consumption Summarization

| | |
|---|---|
| **Sprint** | 3 — RAG Knowledge Base & LLM Pipeline |
| **Trigger** | Before the core recommendation call, when the user has **7+ days of history** |
| **Output** | Plain text summary |
| **Purpose** | Compress long consumption logs into a short summary to stay within token limits |

## Input variables

| Placeholder | Description |
|---|---|
| `{consumption_logs}` | Raw consumption logs, last 30 days. Format: `[{ "timestamp": "...", "appliance": "...", "kwh": float }]` |

## Prompt

```
You are a data summarization assistant for an energy app.

## Raw Consumption Logs (last 30 days)
{consumption_logs}
// Format: [{ "timestamp": "...", "appliance": "...", "kwh": float }]

Summarize this user's energy consumption patterns
in 3 to 5 concise sentences.

Focus on:
- Peak usage times
- Most frequently used appliances
- Any notable habits or patterns
- Times when consumption is consistently low

Return plain text only, no JSON, no bullet points.
```

## Output

Plain text — 3 to 5 sentences, no JSON, no bullet points. This summary is passed into
[Prompt 5 — Core Recommendation](05_core_recommendation.md) as `{consumption_summary}`.

## Status in codebase

🔴 **Not built.** The app does not yet collect per-appliance consumption logs — there is no
`consumption_logs` table and no metering integration. Until that exists, every user stays on the
[cold-start path (Prompt 2)](02_cold_start.md) and this summarization step is skipped. Note the
trigger says "last 30 days" of logs but fires once a user crosses **7+ days** of history.
