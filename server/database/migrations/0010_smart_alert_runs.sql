ALTER TABLE `smart_alert_settings` ADD `horizon_hours` integer DEFAULT 6 NOT NULL;
--> statement-breakpoint
CREATE TABLE `smart_alert_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`ran_at` integer NOT NULL,
	`window_found` integer NOT NULL,
	`carbon_intensity` real,
	`window_start` text,
	`window_end` text,
	`recipient_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `scheduled_jobs` (`id`, `name`, `subject`, `body`, `target_type`, `target_user_ids`, `cron_expression`, `next_run_at`, `enabled`, `created_by_id`, `created_at`)
VALUES ('smart-alert-job', 'Smart low-carbon alert', 'Low-carbon window', 'Generated per run from the live forecast.', 'smartAlert', NULL, '0 * * * *', unixepoch(), 1, 'system', unixepoch());
