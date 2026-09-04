-- Replace the per-message shift log with a daily, user-owned "Appliance Schedule".
-- The old message_actions data isn't important, so we drop it. An appliance can run
-- several times a day → one row per run, grouped by `day` (Helsinki YYYY-MM-DD), with
-- no per-appliance uniqueness. smart_alert_context stays (still marks smart-alert
-- messages and holds the suggested appliance).
DROP TABLE `message_actions`;
--> statement-breakpoint
CREATE TABLE `appliance_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`appliance_slug` text NOT NULL,
	`start_at_ms` integer NOT NULL,
	`run_time_min` integer NOT NULL,
	`carbon_at_start` real,
	`avg_24h` real,
	`estimated_saving_g` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `appliance_shifts_user_day_idx` ON `appliance_shifts` (`user_id`,`day`);
