CREATE TABLE IF NOT EXISTS `smart_alert_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`threshold` integer DEFAULT 20 NOT NULL,
	`debounce_hours` integer DEFAULT 3 NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`action` text NOT NULL,
	`before` text,
	`after` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `smart_alert_settings` (`id`, `enabled`, `threshold`, `debounce_hours`, `updated_at`, `updated_by_id`)
VALUES (1, 1, 20, 3, unixepoch(), 'system');
