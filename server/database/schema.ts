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

export const messageTemplates = sqliteTable('message_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  type: text('type', { enum: ['broadcast', 'targeted'] }).notNull(),
  sentById: text('sent_by_id').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const userMessages = sqliteTable('user_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  messageId: text('message_id').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const fcmTokens = sqliteTable('fcm_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const scheduledJobs = sqliteTable('scheduled_jobs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  targetType: text('target_type', { enum: ['broadcast', 'targeted'] }).notNull(),
  targetUserIds: text('target_user_ids'),
  cronExpression: text('cron_expression').notNull(),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }).notNull(),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdById: text('created_by_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type MessageTemplate = typeof messageTemplates.$inferSelect
export type Message = typeof messages.$inferSelect
export type UserMessage = typeof userMessages.$inferSelect
export type FcmToken = typeof fcmTokens.$inferSelect
export type ScheduledJob = typeof scheduledJobs.$inferSelect
