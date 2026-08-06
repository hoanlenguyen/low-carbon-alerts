ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `onboarding_completed_at` integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`housing_type` text NOT NULL,
	`household_size` integer NOT NULL,
	`contract_type` text NOT NULL,
	`primary_heating` text NOT NULL,
	`appliances` text NOT NULL,
	`active_hours_start` text NOT NULL,
	`active_hours_end` text NOT NULL,
	`peak_times` text NOT NULL,
	`notif_times` text NOT NULL,
	`energy_goal` text NOT NULL,
	`notif_style` text NOT NULL,
	`follows_prices` text NOT NULL,
	`created_at` integer NOT NULL
);
