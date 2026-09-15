-- Weekly email digest: per-user opt-in (default on) + a seeded scheduled job that the
-- hourly cron picks up. targetType 'weeklyDigest' is a TS-only enum change (no DB constraint).
ALTER TABLE `user_profiles` ADD `weekly_email_opt_in` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
INSERT INTO `scheduled_jobs` (`id`, `name`, `subject`, `body`, `target_type`, `target_user_ids`, `cron_expression`, `next_run_at`, `last_run_at`, `enabled`, `created_by_id`, `created_at`)
VALUES ('weekly-digest', 'Weekly digest', 'Your week with Hiilivahti', 'Weekly email digest for opted-in users.', 'weeklyDigest', NULL, '0 8 * * 1', 0, NULL, 1, 'system', 0);
