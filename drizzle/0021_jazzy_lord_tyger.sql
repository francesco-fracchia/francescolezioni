CREATE TABLE `request_followups` (
	`request_id` text PRIMARY KEY NOT NULL,
	`last_contact_at` text,
	`next_action` text DEFAULT '' NOT NULL,
	`next_action_date` text,
	`source` text DEFAULT 'unknown' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_request_followups_date` ON `request_followups` (`next_action_date`);--> statement-breakpoint
CREATE TABLE `tutor_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
