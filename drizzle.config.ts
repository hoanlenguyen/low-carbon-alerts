import { defineConfig } from 'drizzle-kit'
import { loadEnv } from 'vite'

const env = loadEnv('', process.cwd(), '')

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: env.NUXT_TURSO_URL,
    authToken: env.NUXT_TURSO_AUTH_TOKEN
  }
})
