CREATE TABLE `matching_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`mode` text NOT NULL,
	`availability` text NOT NULL,
	`notes` text NOT NULL,
	`checks` text NOT NULL,
	`members` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`group_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
