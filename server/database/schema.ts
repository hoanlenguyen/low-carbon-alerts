import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  onboardingCompletedAt: integer('onboarding_completed_at', { mode: 'timestamp' })
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
  type: text('type', { enum: ['broadcast', 'targeted', 'smart-alert', 'forecast'] }).notNull(),
  sentById: text('sent_by_id').notNull(),
  // Groups the per-consumer smart-alert messages produced by one runSmartAlert tick
  // back to their smart_alert_runs row, so message lists can collapse a run into a
  // single entry (recipient count = messages in the run, sent time = run.ranAt).
  // Null for non-smart-alert messages.
  smartAlertRunsId: text('smart_alert_runs_id'),
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
  targetType: text('target_type', { enum: ['broadcast', 'targeted', 'smartAlert'] }).notNull(),
  targetUserIds: text('target_user_ids'),
  cronExpression: text('cron_expression').notNull(),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }).notNull(),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdById: text('created_by_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const smartAlertSettings = sqliteTable('smart_alert_settings', {
  id: integer('id').primaryKey(), // always 1 (singleton)
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  threshold: integer('threshold').notNull().default(20), // gCO₂/kWh
  debounceHours: integer('debounce_hours').notNull().default(3),
  horizonHours: integer('horizon_hours').notNull().default(6), // how far ahead to scan the forecast
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  updatedById: text('updated_by_id').notNull()
})

// One row per smart-alert cron run — the trigger history. "windowFound" marks a
// successful run (a qualifying low-carbon window met the threshold).
export const smartAlertRuns = sqliteTable('smart_alert_runs', {
  id: text('id').primaryKey(),
  ranAt: integer('ran_at', { mode: 'timestamp' }).notNull(),
  windowFound: integer('window_found', { mode: 'boolean' }).notNull(),
  carbonIntensity: real('carbon_intensity'), // the window's carbon point, null if no window
  windowStart: text('window_start'), // "HH:MM", null if no window
  windowEnd: text('window_end'), // "HH:MM", null if no window
  recipientCount: integer('recipient_count').notNull().default(0)
})

// Structured context for one sent smart-alert message, captured at send time so a
// user's "I shifted it" confirmation can estimate the CO2 avoided. 1:1 with a
// smart-alert messages row (only smart alerts carry a window + suggested appliance).
export const smartAlertContext = sqliteTable('smart_alert_context', {
  messageId: text('message_id').primaryKey(),
  suggestedApplianceSlug: text('suggested_appliance_slug'),
  windowStart: text('window_start'), // "HH:MM" display
  windowEnd: text('window_end'),
  windowMinutes: integer('window_minutes'), // clean-window length, caps credited run time
  carbonIntensity: real('carbon_intensity'), // gCO₂/kWh at the window
  avg24h: real('avg_24h'), // 24h grid average at send time
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})
export type SmartAlertContext = typeof smartAlertContext.$inferSelect

// A user's self-reported "I shifted a load for this alert". One per (user, message);
// estimatedSavingG is snapshotted at confirm time so later catalog edits don't rewrite it.
export const messageActions = sqliteTable('message_actions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  messageId: text('message_id').notNull(),
  applianceSlug: text('appliance_slug'), // the appliance they say they shifted (catalog slug)
  estimatedSavingG: integer('estimated_saving_g').notNull().default(0),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }).notNull()
}, t => ([
  uniqueIndex('message_actions_user_message_unique').on(t.userId, t.messageId)
]))
export type MessageAction = typeof messageActions.$inferSelect

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // e.g. 'smart_alert.settings.update'
  before: text('before'), // JSON snapshot
  after: text('after'), // JSON snapshot
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

export const userProfiles = sqliteTable('user_profiles', {
  userId: text('user_id').primaryKey(),
  housingType: text('housing_type').notNull(),
  householdSize: integer('household_size').notNull(),
  contractType: text('contract_type').notNull(),
  primaryHeating: text('primary_heating').notNull(),
  appliances: text('appliances').notNull(), // JSON string[]
  activeHoursStart: text('active_hours_start').notNull(),
  activeHoursEnd: text('active_hours_end').notNull(),
  peakTimes: text('peak_times').notNull(), // JSON string[]
  notifTimes: text('notif_times').notNull(), // JSON string[]
  energyGoal: text('energy_goal').notNull(),
  notifStyle: text('notif_style', { enum: ['detailed', 'simple'] }).notNull(),
  followsPrices: text('follows_prices').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})

// Catalog of household appliances offered in onboarding and referenced (by `name`)
// from recommendations / kb_chunks. `flexibility` drives which appliance the smart
// alert prefers to shift; power/duration are optional impact metadata.
export const appliances = sqliteTable('appliances', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(), // stable machine key, e.g. 'dishwasher'
  name: text('name').notNull().unique(), // display label + soft join key ("Dishwasher")
  icon: text('icon').notNull(), // lucide icon name
  category: text('category', { enum: ['wet', 'heating', 'ev', 'cooking', 'leisure', 'other'] }).notNull(),
  flexibility: text('flexibility', { enum: ['high', 'medium', 'low'] }).notNull(), // shiftability
  typicalPowerKw: real('typical_power_kw'), // nullable — rough draw for impact estimates
  typicalDurationMin: integer('typical_duration_min'), // nullable — run length, sizes the window
  description: text('description'), // nullable — short helper text
  sortOrder: integer('sort_order').notNull().default(0), // onboarding option order
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), // show in the end-user onboarding picker
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})
export type Appliance = typeof appliances.$inferSelect

// One active recommendation per user (cold-start for now; see prompts/02_cold_start.md).
export const recommendations = sqliteTable('recommendations', {
  userId: text('user_id').primaryKey(),
  recommendation: text('recommendation').notNull(), // the friendly headline shown to the user
  appliance: text('appliance').notNull(),
  bestTime: text('best_time'), // "HH:MM" Helsinki, null if no forecast window
  carbonIntensity: real('carbon_intensity'), // gCO₂/kWh at the window, null if unknown
  carbonSaving: text('carbon_saving', { enum: ['low', 'medium', 'high'] }).notNull(),
  reason: text('reason').notNull(), // deterministic, factual "why"
  tip: text('tip'), // retrieved knowledge-base tip (RAG), null if none
  isColdStart: integer('is_cold_start', { mode: 'boolean' }).notNull().default(true),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull()
})

// RAG knowledge-base chunks + their OpenAI embeddings (prompts/03–05).
// Retrieval loads these and ranks by cosine similarity in the Worker.
// Chunk text for the RAG layer. Vectors live in Cloudflare Vectorize (keyed by
// the same id); this table holds the content retrieval returns.
export const kbChunks = sqliteTable('kb_chunks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  appliance: text('appliance').notNull(),
  content: text('content').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

// Singleton row (id = 1) tracking the content hash of the last-embedded KB, so
// the KB can auto-reindex only when server/data/energyTips.ts actually changes.
export const kbMeta = sqliteTable('kb_meta', {
  id: integer('id').primaryKey(), // always 1
  contentHash: text('content_hash').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type MessageTemplate = typeof messageTemplates.$inferSelect
export type Message = typeof messages.$inferSelect
export type UserMessage = typeof userMessages.$inferSelect
export type FcmToken = typeof fcmTokens.$inferSelect
export type ScheduledJob = typeof scheduledJobs.$inferSelect
export type UserProfile = typeof userProfiles.$inferSelect
export type Recommendation = typeof recommendations.$inferSelect
export type KbChunk = typeof kbChunks.$inferSelect
export type KbMeta = typeof kbMeta.$inferSelect
export type SmartAlertRun = typeof smartAlertRuns.$inferSelect

// General daily electricity-forecast message: generated once per Helsinki day and
// served to all end-users (the dashboard "Forecast · next 24h" card). Singleton id=1.
export const dailyForecast = sqliteTable('daily_forecast', {
  id: integer('id').primaryKey(), // always 1
  subject: text('subject').notNull(),
  body: text('body').notNull(), // full generated message; the card shows the forecast portion
  forDate: text('for_date').notNull(), // "YYYY-MM-DD" Helsinki
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull()
})
export type DailyForecast = typeof dailyForecast.$inferSelect
