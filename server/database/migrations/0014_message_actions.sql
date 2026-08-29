CREATE TABLE `smart_alert_context` (
	`message_id` text PRIMARY KEY NOT NULL,
	`suggested_appliance_slug` text,
	`window_start` text,
	`window_end` text,
	`carbon_intensity` real,
	`avg_24h` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text NOT NULL,
	`appliance_slug` text,
	`estimated_saving_g` integer DEFAULT 0 NOT NULL,
	`confirmed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_actions_user_message_unique` ON `message_actions` (`user_id`,`message_id`);
