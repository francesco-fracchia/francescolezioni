CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`details` text NOT NULL,
	`assessment` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL,
	`consent_version` text NOT NULL
);
