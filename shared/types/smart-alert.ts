// Row shapes for the admin Smart Alert tables, shared by the API handlers and the
// page. Timestamp fields are `string | Date`: Drizzle yields a `Date` on the server,
// which becomes a `string` once the response is JSON-serialized to the client.

// A sent smart-alert message with its recipient (messages → user_messages → users).
export interface HistoryRow {
  id: string
  subject: string
  body: string
  sentAt: string | Date | null
  recipient: string | null
}

// One smart-alert cron/trigger run (smart_alert_runs).
export interface RunRow {
  id: string
  ranAt: string | Date | null
  windowFound: boolean
  carbonIntensity: number | null
  windowStart: string | null
  windowEnd: string | null
  recipientCount: number
}

// A settings-change entry from the audit log (audit_logs), before/after parsed to objects.
export interface AuditRow {
  id: string
  userEmail: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: string | Date | null
}
