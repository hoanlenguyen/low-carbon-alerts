ALTER TABLE `users` ADD `user_name` text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE `users` SET `user_name` = lower(`email`);
--> statement-breakpoint
DROP INDEX `users_email_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_user_name_unique` ON `users` (`user_name`);
