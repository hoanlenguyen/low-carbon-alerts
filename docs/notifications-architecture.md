# Notification Delivery — Architecture & Scalability

Low Carbon Alerts delivers messages to end-users (smart alerts, admin broadcasts,
the daily forecast). This note documents how delivery works today, where it stops
scaling, what has already been hardened, and the roadmap for larger user counts.

## 1. Delivery channels

There are **two** channels, with very different scaling characteristics:

| Channel | Path | Purpose | Scales? |
|---|---|---|---|
| **FCM push** | `sendNotification` → Firebase Cloud Messaging HTTP v1 | Background/offline delivery to the device | ✅ Google's infrastructure does the fan-out |
| **SSE real-time** | `/api/notifications/stream` + in-memory `sseClients` map | Live inbox update for a foreground tab | ❌ The scaling bottleneck (see §3) |

The **database is the source of truth**: every message is written to `messages` and a
per-user row to `user_messages`, so the inbox is correct even if a live push is missed.

## 2. Current architecture

```
Admin "Send" / Smart-alert cron / n8n forecast broadcast
        │
        ▼
 sendNotification(event, opts)                    server/utils/sendNotification.ts
   1. INSERT messages (1 row)
   2. resolve recipients (all consumers for broadcast/forecast, else targetUserIds)
   3. INSERT user_messages (fan-out, chunked)
   4. FCM push per token (bounded concurrency, dead-token cleanup)
   5. SSE push to any live tabs (in-memory sseClients map)
```

- **Scheduling** is external: a standalone Cloudflare **Cron Trigger Worker** (`workers/cron/`)
  pings the Pages route `/_cron` hourly, which dispatches due `scheduled_jobs`
  (including the per-consumer smart alert). Pages itself has no native cron.
- **Smart alerts** are detected **per consumer** (`runSmartAlert`): all active users +
  all profiles are loaded in **two bulk queries** and iterated in memory (a `Map`,
  no N+1), each consumer's cleanest ≤4h window found within their active hours.
- **General messages** (admin broadcast, daily forecast) are generated **once** and
  broadcast to everyone. The **daily forecast** is cached once per Helsinki day in
  `daily_forecast` (`getDailyForecast`) so the LLM runs at most once a day.

## 3. Where it stops scaling

### 3.1 SSE real-time is isolate-local (the main limit)
`sseClients` is a plain in-memory `Map` (`server/utils/sseClients.ts`). Cloudflare
Workers/Pages are **stateless and run across many isolates and data centers**:

- A user's SSE connection lives in **one** isolate's memory.
- When `sendNotification` runs, it may execute in a **different** isolate whose map
  does not contain that connection → the live push is silently dropped.

This works in local dev (single process) and becomes unreliable in production as
traffic spreads. **It is an architectural mismatch, not just a ceiling.** Practical
stance: treat SSE as a best-effort nicety and rely on FCM + the DB-backed inbox.

### 3.2 Per-request subrequest cap
A broadcast makes one `fetch` to FCM per token inside a single request. Workers cap
outbound subrequests per invocation (**~50 free / ~1000 paid**) and CPU time, so a
single request cannot deliver to more tokens than that cap — regardless of how the
code is written.

### 3.3 D1 statement limits
SQLite/D1 caps bound variables per statement (~999). A naive bulk `INSERT` or
`IN (…)` over thousands of users exceeds it.

### 3.4 In-memory bulk load
`runSmartAlert` loads *all* profiles into one Worker's memory (~128 MB cap). Fine for
thousands; at hundreds of thousands it must be paginated.

## 4. Applied improvements (no new infrastructure)

`sendNotification` was hardened to run safely on the current free plan:

- **Chunked `user_messages` inserts** (100 rows/statement) — within the D1 variable limit.
- **Chunked token lookup** — the `IN (…)` list is split into chunks (fixes a latent
  large-broadcast bug).
- **Bounded-concurrency FCM** (20 at a time) instead of one enormous `Promise.all`.
- **Dead-token cleanup** — tokens FCM reports as `UNREGISTERED` / `404` are deleted, so
  the `fcm_tokens` table stays lean and future sends don't waste subrequests.

These remove the "one giant fan-out" risk and keep the table healthy, but do **not**
lift the hard per-request subrequest cap (§3.2).

## 5. Scaling roadmap

### 5.1 Broadcast fan-out → Cloudflare Queues
Decouple *send* from *delivery*:

```
producer (cron/admin)  ──enqueue batches of ~25 users──▶  Queue  ──▶  consumer Worker
                                                                        (LLM + FCM + D1
                                                                         per batch, retries, DLQ)
```

Each consumer invocation does bounded work, the platform handles backpressure and
retries, and no single request can time out. **Requires the Workers Paid plan, a
created queue, and a standalone consumer Worker** (Pages Functions can *produce* to a
queue but cannot *consume*). FCM sends can be batched further via multicast.

### 5.2 Reliable in-app real-time → Durable Objects / managed service
The isolate-local SSE map (§3.1) needs a component with a **stable, single instance**
that can hold a connection and be signalled from anywhere:

- **Cloudflare Durable Objects** (or the **Agents SDK**, which is built on Durable
  Objects and exposes `broadcast()` + HTTP/SSE/WebSocket). A DO per user (or a hub)
  holds the connection; `sendNotification` signals the DO to push. This is the
  CF-native fix. **Requires Workers Paid + a Worker to host the DO class** (Pages
  cannot declare Durable Objects).
- **Managed realtime** — **Ably, Pusher, or Supabase Realtime**: the Worker publishes an
  event, the browser subscribes via the provider's SDK. Simplest to adopt; offloads
  the connection-scaling problem entirely.

### 5.3 Profiles at very large scale
Keep the bulk-load-and-loop pattern, but **paginate** the profile load (e.g. 1–5k at a
time) once the full set no longer fits comfortably in a Worker's memory. Queues give
this chunking naturally (enqueue per batch; the consumer loads that batch).

## 6. Recommendation by stage

| Stage | In-app real-time | Broadcast fan-out |
|---|---|---|
| **Now (small)** | SSE best-effort + FCM as source of truth | Chunked/bounded `sendNotification` (done) |
| **Growing (100s–1000s)** | Consider Ably/Supabase or Durable Objects | Cloudflare Queues + FCM multicast |
| **Large (10k+)** | Durable Objects / Agents SDK or managed realtime | Queues (paginated producer) + DLQ + token hygiene |

**Bottom line:** FCM is the reliable delivery channel and the DB-backed inbox is the
source of truth; SSE is a foreground convenience. The current chunked fan-out is
correct and safe for this project's scale, and the paid-plan upgrades (Queues +
Durable Objects/managed realtime) are the clear path when user counts grow.
