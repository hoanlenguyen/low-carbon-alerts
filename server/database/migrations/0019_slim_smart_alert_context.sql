-- Slim smart_alert_context down to what's still read: the message is a smart alert and
-- its suggested appliance. The window/carbon snapshot columns (window_start, window_end,
-- window_minutes, carbon_intensity, avg_24h) are no longer used — the saving estimate now
-- lives in the daily Appliance Schedule with the baseline recomputed from the live
-- forecast. SQLite can't drop columns in place, so rebuild the table (data preserved).
CREATE TABLE `__new_smart_alert_context` (
	`message_id` text PRIMARY KEY NOT NULL,
	`suggested_appliance_slug` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_smart_alert_context` (`message_id`, `suggested_appliance_slug`, `created_at`)
	SELECT `message_id`, `suggested_appliance_slug`, `created_at` FROM `smart_alert_context`;
--> statement-breakpoint
DROP TABLE `smart_alert_context`;
--> statement-breakpoint
ALTER TABLE `__new_smart_alert_context` RENAME TO `smart_alert_context`;
