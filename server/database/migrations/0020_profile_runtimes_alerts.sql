-- Onboarding/profile refresh: drop unused fields (peak_times, notif_times, follows_prices)
-- and add appliance_runtimes (per-appliance typical run time, JSON name→minutes) and
-- max_alerts_per_day (per-user daily smart-alert cap, default 2). SQLite can't drop
-- columns in place, so rebuild the table (existing rows preserved; new columns get defaults).
CREATE TABLE `__new_user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`housing_type` text NOT NULL,
	`household_size` integer NOT NULL,
	`contract_type` text NOT NULL,
	`primary_heating` text NOT NULL,
	`appliances` text NOT NULL,
	`appliance_runtimes` text DEFAULT '{}' NOT NULL,
	`active_hours_start` text NOT NULL,
	`active_hours_end` text NOT NULL,
	`energy_goal` text NOT NULL,
	`notif_style` text NOT NULL,
	`max_alerts_per_day` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user_profiles` (`user_id`, `housing_type`, `household_size`, `contract_type`, `primary_heating`, `appliances`, `active_hours_start`, `active_hours_end`, `energy_goal`, `notif_style`, `created_at`)
	SELECT `user_id`, `housing_type`, `household_size`, `contract_type`, `primary_heating`, `appliances`, `active_hours_start`, `active_hours_end`, `energy_goal`, `notif_style`, `created_at` FROM `user_profiles`;
--> statement-breakpoint
DROP TABLE `user_profiles`;
--> statement-breakpoint
ALTER TABLE `__new_user_profiles` RENAME TO `user_profiles`;
