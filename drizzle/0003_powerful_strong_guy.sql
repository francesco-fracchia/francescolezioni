ALTER TABLE `scheduled_lessons` ADD `payment_method` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `payment_status` text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `paid_at` text;