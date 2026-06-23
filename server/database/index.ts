/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from './schema'

export function useDrizzle(event: H3Event) {
  const db = (event.context.cloudflare as { env: { DB: D1Database } } | undefined)?.env?.DB
  if (!db) {
    throw new Error('D1 binding "DB" is not available on this request')
  }
  return drizzle(db, { schema })
}

export { schema }
