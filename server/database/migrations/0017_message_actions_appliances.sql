-- "I shifted it" becomes multi-appliance: one message_actions row per shifted
-- appliance, each with its own chosen start hour + run time. The saving is snapshotted
-- from the per-hour forecast carbon. Existing rows (one appliance per message) stay
-- valid — the new columns are nullable and the unique key just gains appliance_slug.
DROP INDEX `message_actions_user_message_unique`;
--> statement-breakpoint
ALTER TABLE `message_actions` ADD `start_at_ms` integer;
--> statement-breakpoint
ALTER TABLE `message_actions` ADD `run_time_min` integer;
--> statement-breakpoint
ALTER TABLE `message_actions` ADD `carbon_at_start` real;
--> statement-breakpoint
CREATE UNIQUE INDEX `message_actions_user_message_appliance_unique` ON `message_actions` (`user_id`,`message_id`,`appliance_slug`);
