# Prompt 3 — RAG Query Rewriting

| | |
|---|---|
| **Sprint** | 3 — RAG Knowledge Base & LLM Pipeline |
| **Trigger** | Before **every** vector store retrieval |
| **Output** | Plain text query |
| **Purpose** | Turn user context into a clean search query for the vector store |

## Input variables

| Placeholder | Description |
|---|---|
| `{appliance_list}` | The user's appliances |
| `{time_of_day}` | Current time of day (e.g. "evening") |
| `{carbon_intensity}` | Carbon intensity right now, gCO₂/kWh |
| `{energy_goal}` | The user's stated goal |

## Prompt

```
You are a search query assistant for an energy knowledge base.

## User Context
- Appliances: {appliance_list}
- Current time of day: {time_of_day}
- Carbon intensity right now: {carbon_intensity} gCO2/kWh
- User goal: {energy_goal}

Rewrite this context as a short, precise search query
of maximum 100 words to retrieve relevant energy-saving
tips from a knowledge base.

Return plain text only, no JSON, no explanation.

Example output:
"dishwasher washing machine off-peak low carbon evening scheduling"
```

## Output

Plain text — a compact keyword-style query, ≤100 words. Example:

```
dishwasher washing machine off-peak low carbon evening scheduling
```

## Status in codebase

🔴 **Not built.** There is no vector store, embeddings, or retrieval layer in the project yet
(confirmed via the graphify graph — no RAG-related nodes). This prompt is the first step of the
Sprint 3 RAG pipeline: its output feeds the vector search whose chunks are injected into
[Prompt 5 — Core Recommendation](05_core_recommendation.md) as `{rag_retrieved_chunks}`.
