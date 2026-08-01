import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

export function useDrizzle() {
  const config = useRuntimeConfig()
  const client = createClient({
    url: config.tursoUrl,
    authToken: config.tursoAuthToken || undefined
  })
  return drizzle(client, { schema })
}

export { schema }
