CREATE TABLE `course_enrollments` (
	`student_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`student_id`, `course_id`)
);
--> statement-breakpoint
CREATE TABLE `course_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`object_key` text,
	`filename` text,
	`mime` text,
	`size` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_course_materials_module` ON `course_materials` (`module_id`);--> statement-breakpoint
CREATE TABLE `course_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_course_modules_course` ON `course_modules` (`course_id`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `material_progress` (
	`student_id` text NOT NULL,
	`material_id` text NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`student_id`, `material_id`)
);
--> statement-breakpoint
CREATE TABLE `student_access` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_student_access_student_email` ON `student_access` (`student_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_student_access_email` ON `student_access` (`email`);--> statement-breakpoint
CREATE INDEX `idx_student_access_user` ON `student_access` (`user_id`);