CREATE TABLE `public_request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_public_request_limits_expiry` ON `public_request_limits` (`expires_at`);