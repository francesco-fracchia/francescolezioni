CREATE TABLE `calendar_connections` (
	`account_id` text PRIMARY KEY NOT NULL,
	`encrypted_credentials` text,
	`selected_calendars` text DEFAULT '[]' NOT NULL,
	`feed_token_hash` text,
	`encrypted_feed_token` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_calendar_feed_token` ON `calendar_connections` (`feed_token_hash`);