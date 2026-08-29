CREATE TABLE `appliances` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`category` text NOT NULL,
	`flexibility` text NOT NULL,
	`typical_power_kw` real,
	`typical_duration_min` integer,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appliances_slug_unique` ON `appliances` (`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `appliances_name_unique` ON `appliances` (`name`);
--> statement-breakpoint
INSERT INTO `appliances` (`id`, `slug`, `name`, `icon`, `category`, `flexibility`, `typical_power_kw`, `typical_duration_min`, `description`, `sort_order`, `is_active`, `created_at`)
VALUES
	('washing-machine', 'washing-machine', 'Washing machine', 'i-lucide-washing-machine', 'wet', 'high', 2.0, 120, 'Delay-start to any clean window; wash at 30–40°C.', 10, true, unixepoch()),
	('dishwasher', 'dishwasher', 'Dishwasher', 'i-lucide-utensils', 'wet', 'high', 1.5, 150, 'Highly flexible — run full loads on the eco programme overnight.', 20, true, unixepoch()),
	('ev-charger', 'ev-charger', 'EV charger', 'i-lucide-battery-charging', 'ev', 'high', 7.0, 240, 'The most shiftable home load — schedule the overnight clean window.', 30, true, unixepoch()),
	('electric-oven', 'electric-oven', 'Electric oven', 'i-lucide-cooking-pot', 'cooking', 'low', 2.5, 60, 'Hard to time around meals; batch-cook in cleaner windows.', 40, true, unixepoch()),
	('sauna', 'sauna', 'Sauna', 'i-lucide-flame', 'leisure', 'medium', 7.0, 60, 'Large discretionary load; pre-heat only for the time you need.', 50, true, unixepoch()),
	('tumble-dryer', 'tumble-dryer', 'Tumble dryer', 'i-lucide-fan', 'wet', 'high', 2.5, 60, 'Energy-hungry — run off-peak or air-dry to skip the load.', 60, true, unixepoch()),
	('hot-tub', 'hot-tub', 'Hot tub', 'i-lucide-bath', 'leisure', 'medium', 4.0, 120, 'Schedule the main reheat overnight and keep the cover on.', 70, true, unixepoch()),
	('heat-pump', 'heat-pump', 'Heat pump', 'i-lucide-wind', 'heating', 'medium', 3.0, 120, 'Pre-heat during clean hours and coast on the home’s thermal mass.', 80, true, unixepoch());
