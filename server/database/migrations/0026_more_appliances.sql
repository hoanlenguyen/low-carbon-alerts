-- Additional shiftable household appliances for the onboarding/schedule catalog.
INSERT INTO `appliances` (`id`, `slug`, `name`, `icon`, `category`, `flexibility`, `typical_power_kw`, `typical_duration_min`, `description`, `sort_order`, `is_active`, `created_at`)
VALUES
	('water-heater', 'water-heater', 'Water heater', 'i-lucide-droplets', 'heating', 'high', 2.5, 120, 'Heat the tank during a clean window and coast on the stored hot water.', 90, true, unixepoch()),
	('dehumidifier', 'dehumidifier', 'Dehumidifier', 'i-lucide-droplet', 'other', 'high', 0.3, 240, 'Runs for hours with no urgency — schedule it into the cleanest stretch.', 100, true, unixepoch()),
	('ebike-charger', 'ebike-charger', 'E-bike charger', 'i-lucide-bike', 'ev', 'high', 0.3, 180, 'A small overnight load — easy to move to the greenest hours.', 110, true, unixepoch());
