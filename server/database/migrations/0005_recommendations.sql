CREATE TABLE `recommendations` (
	`user_id` text PRIMARY KEY NOT NULL,
	`recommendation` text NOT NULL,
	`appliance` text NOT NULL,
	`best_time` text,
	`carbon_intensity` real,
	`carbon_saving` text NOT NULL,
	`reason` text NOT NULL,
	`is_cold_start` integer DEFAULT true NOT NULL,
	`generated_at` integer NOT NULL
);
