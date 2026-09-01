// One sent message for the admin "Sent messages" log (each row = one messages row,
// with its recipient count). Timestamp is `string | Date`: Drizzle yields a Date on
// the server, a string once JSON-serialized to the client.
export interface SentMessageRow {
  id: string
  subject: string
  body: string
  type: 'broadcast' | 'targeted' | 'smart-alert' | 'forecast'
  recipients: number // total recipient count for this message
  recipient: { name: string | null, email: string | null } | null // set only when there is exactly one
  sentAt: string | Date | null
}
