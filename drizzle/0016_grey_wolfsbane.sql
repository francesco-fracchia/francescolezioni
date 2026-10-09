CREATE TABLE `homework_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`plan_id` text,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`instructions` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`object_key` text,
	`filename` text,
	`mime` text,
	`size` integer,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_homework_assignments_student` ON `homework_assignments` (`student_id`,`status`);--> statement-breakpoint
CREATE TABLE `homework_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`submitted_by` text NOT NULL,
	`attempt` integer NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`object_key` text,
	`filename` text,
	`mime` text,
	`size` integer,
	`content_hash` text NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`feedback_status` text DEFAULT 'draft' NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_homework_submissions_attempt` ON `homework_submissions` (`assignment_id`,`attempt`);