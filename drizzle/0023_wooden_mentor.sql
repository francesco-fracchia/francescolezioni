CREATE TABLE `consultation_recurrence` (
	`id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`from_time` text NOT NULL,
	`to_time` text NOT NULL,
	`mode` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`generated_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `consultation_slots` ADD `recurrence_id` text;