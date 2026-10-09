CREATE TABLE `lesson_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`access_token` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'awaiting' NOT NULL,
	`stripe_session` text,
	`paid_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lesson_payments_lesson` ON `lesson_payments` (`lesson_id`);