CREATE TABLE `lesson_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`appointment_kind` text NOT NULL,
	`appointment_id` text NOT NULL,
	`title` text NOT NULL,
	`topics` text NOT NULL,
	`practice` text DEFAULT '' NOT NULL,
	`next_steps` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lesson_summaries_student_appointment` ON `lesson_summaries` (`student_id`,`appointment_kind`,`appointment_id`);--> statement-breakpoint
CREATE INDEX `idx_lesson_summaries_student` ON `lesson_summaries` (`student_id`,`status`);--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`objective` text NOT NULL,
	`target_date` text,
	`starting_point` text DEFAULT '' NOT NULL,
	`topics` text DEFAULT '' NOT NULL,
	`next_steps` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_study_plans_student` ON `study_plans` (`student_id`,`status`);