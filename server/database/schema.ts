import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  googleId: text('google_id').unique(),
  avatarUrl: text('avatar_url'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' })
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
