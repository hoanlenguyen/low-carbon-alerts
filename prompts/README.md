# Prompt Library — Low Carbon Alerts

The AI-assisted feedback system is driven by **9 prompts**, each with a defined trigger,
a strict output contract, and a place in the 8-sprint build plan. This folder is the
canonical reference for every prompt: the exact template, its input variables, its output
schema, and its current status in the codebase.

> All timestamps are **Europe/Helsinki**. Carbon intensity is **gCO₂/kWh**, sourced from the
> Sähköjälki / Flip API (`https://flipapi.net`).

## Master table

| # | Prompt | Sprint | Trigger | Output format | Status in codebase |
|---|---|---|---|---|---|
| 1 | [Onboarding extraction](01_onboarding_extraction.md) | 2 | User completes onboarding | JSON profile | ⚠️ N/A — onboarding is a typed form, not free-text |
| 2 | [Cold start defaults](02_cold_start.md) | 2 | New user, first app open after onboarding | JSON recommendation | 🟡 Designed, not built |
| 3 | [RAG query rewriting](03_rag_query_rewriting.md) | 3 | Before vector store retrieval | Plain text query | 🔴 Not built (no RAG layer) |
| 4 | [Consumption summarization](04_consumption_summarization.md) | 3 | Before recommendation, 7+ days history | Plain text summary | 🔴 Not built (no consumption history) |
| 5 | [Core recommendation](05_core_recommendation.md) | 3 | User opens app | JSON recommendation array | 🔴 Not built |
| 6 | [Notification decision](06_notification_decision.md) | 4 | Every cron run, per user | JSON decision object | 🟡 Partial — deterministic broadcast alert in `_cron.ts` |
| 7 | [Push notification message](07_push_notification_message.md) | 5 | `should_notify = true` | Plain text message | 🟡 Partial — `generateAlertMessage.ts` (grid-context, broadcast) |
| 8 | [Weekly email digest](08_weekly_email_digest.md) | 5 | Every Monday cron | JSON email content | 🔴 Not built (no email service) |
| 9 | [Feedback interpretation](09_feedback_interpretation.md) | 6 | User responds to a recommendation | JSON constraint object | 🔴 Not built (no feedback capture) |

**Legend:** 🟢 built · 🟡 partial / in progress · 🔴 not built · ⚠️ approach differs from spec

## Pipeline at a glance

```
Onboarding ─▶ [1] extract profile ─▶ [2] cold-start recommendation (no history)
                                              │
              7+ days of history ─────────────┤
                                              ▼
        [3] rewrite query ─▶ RAG retrieve ─▶ [4] summarize consumption ─▶ [5] core recommendation
                                              │
   cron (every 3h) ─▶ [6] notify? ──(yes)──▶ [7] push message ─▶ FCM delivery
                                              │
   Monday cron ─────────────────────────────▶ [8] weekly email digest
                                              │
   user reacts ─────────────────────────────▶ [9] interpret feedback ─▶ update profile constraints
```

## Conventions used in every file

- **Placeholders** are written as `{snake_case}` and listed in an *Input variables* table.
- **Output** is either strict JSON (parse + schema-validate, with a deterministic fallback on
  malformed output) or plain text — never both. The format is stated at the top of each file.
- **Facts must be grounded** in the provided forecast/profile. Prompts must not invent carbon
  intensity values (see the "Do not invent" rules in prompts 5 and 6).

## Model / config

The server calls an OpenAI-compatible endpoint via Nuxt `runtimeConfig`:
`openaiApiKey`, `openaiBaseUrl` (default `https://api.openai.com/v1`), `openaiLlmModel`
(default `gpt-4o-mini`). See [`nuxt.config.ts`](../nuxt.config.ts). When the key is unset, prompts
that have a deterministic fallback still return a valid result; see
[`server/utils/generateAlertMessage.ts`](../server/utils/generateAlertMessage.ts) for the
established parse-with-fallback pattern.
