-- Admin invitations by email. Token-based: only the SHA-256 hash is stored; the raw
-- token travels once in the emailed accept link. Accepting creates the admin user.
CREATE TABLE `admin_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_invites_email_idx` ON `admin_invites` (`email`);
