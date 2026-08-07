CREATE TABLE `kb_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`appliance` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text NOT NULL,
	`updated_at` integer NOT NULL
);
