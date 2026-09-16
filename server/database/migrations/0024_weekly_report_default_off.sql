-- Weekly report defaults to OFF: disable the seeded weekly-digest scheduled job so it
-- doesn't send until an admin turns it on from Settings → Notifications.
UPDATE `scheduled_jobs` SET `enabled` = 0 WHERE `id` = 'weekly-digest';
