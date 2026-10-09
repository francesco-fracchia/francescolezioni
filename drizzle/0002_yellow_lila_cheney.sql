CREATE TABLE `scheduled_lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`mode` text NOT NULL,
	`notes` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER scheduled_lessons_conflict BEFORE INSERT ON scheduled_lessons
WHEN NEW.status='planned' AND (
 EXISTS(SELECT 1 FROM booking_slots WHERE status NOT IN ('available') AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440)
 OR EXISTS(SELECT 1 FROM scheduled_lessons WHERE status='planned' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440)
)
BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
