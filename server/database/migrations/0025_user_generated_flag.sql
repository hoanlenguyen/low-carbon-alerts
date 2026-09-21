-- Flag admin bulk-generated consumer accounts.
ALTER TABLE `users` ADD `is_generated` integer DEFAULT 0 NOT NULL;
