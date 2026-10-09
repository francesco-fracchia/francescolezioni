CREATE TABLE `group_members` (
	`group_id` text NOT NULL,
	`student_id` text NOT NULL,
	PRIMARY KEY(`group_id`, `student_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`student_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`kind` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`error` text,
	`first_attempt_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notifications_event` ON `notifications` (`event_key`);--> statement-breakpoint
CREATE INDEX `idx_notifications_status` ON `notifications` (`status`);--> statement-breakpoint
CREATE TABLE `student_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`school` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`notifications` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_students_name_email` ON `students` (`name`,`email`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `student_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_payments` ADD `student_id` text;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `student_id` text;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `group_id` text;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `version` integer DEFAULT 0 NOT NULL;