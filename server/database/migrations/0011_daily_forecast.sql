CREATE TABLE `daily_forecast` (
	`id` integer PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`for_date` text NOT NULL,
	`generated_at` integer NOT NULL
);
