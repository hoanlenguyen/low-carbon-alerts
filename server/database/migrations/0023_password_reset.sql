-- Password reset (admin + end-user). Single-use hashed tokens (1h expiry) + a throttle
-- log used to rate-limit requests per email and per IP.
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `password_reset_tokens_hash_idx` ON `password_reset_tokens` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);
--> statement-breakpoint
CREATE TABLE `password_reset_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`ip` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `password_reset_requests_email_idx` ON `password_reset_requests` (`email`);
--> statement-breakpoint
CREATE INDEX `password_reset_requests_ip_idx` ON `password_reset_requests` (`ip`);
