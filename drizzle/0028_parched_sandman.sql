CREATE TABLE `calendar_busy_cache` (
	`account_id` text PRIMARY KEY NOT NULL,
	`settings_version` integer NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`checked_at` integer NOT NULL,
	`intervals` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `booking_slots` ADD `recurrence_id` text;--> statement-breakpoint
ALTER TABLE `booking_slots` ADD `generated_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `consultation_recurrence` ADD `paid_generated_until` text;--> statement-breakpoint
ALTER TABLE `consultation_recurrence` ADD `week_days` text DEFAULT '[0,1,2,3,4,5,6]' NOT NULL;--> statement-breakpoint
ALTER TABLE `consultation_recurrence` ADD `lessons_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `consultation_recurrence` ADD `consultations_enabled` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `consultation_slots` ADD `generated_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE booking_slots SET recurrence_id='daily',generated_version=-1 WHERE id LIKE 'online-%' AND status IN ('available','blocked');

--> statement-breakpoint
CREATE TRIGGER consultations_apple_insert BEFORE INSERT ON consultations WHEN NEW.status='confirmed' AND EXISTS(SELECT 1 FROM calendar_connections cc JOIN accounts ca ON ca.id=cc.account_id WHERE ca.role='tutor' AND ca.status='active' AND ca.must_change_password=0 AND cc.encrypted_credentials IS NOT NULL AND cc.selected_calendars!='[]' AND (
 NOT EXISTS(SELECT 1 FROM calendar_busy_cache bc WHERE bc.account_id=cc.account_id AND bc.settings_version=cc.version AND bc.starts_at<=NEW.starts_at AND bc.ends_at>=NEW.ends_at AND bc.checked_at>=(julianday('now')-2440587.5)*86400000-180000)
 OR EXISTS(SELECT 1 FROM calendar_busy_cache bc,json_each(bc.intervals) j WHERE bc.account_id=cc.account_id AND bc.settings_version=cc.version AND julianday(json_extract(j.value,'$.start'))<julianday(NEW.ends_at)+5.0/1440 AND julianday(json_extract(j.value,'$.end'))>julianday(NEW.starts_at)-5.0/1440))) BEGIN SELECT RAISE(ABORT,'ICLOUD_SLOT_UNAVAILABLE'); END;

--> statement-breakpoint
CREATE TRIGGER booking_apple_claim BEFORE UPDATE OF status ON booking_slots WHEN NEW.status='held' AND OLD.status='available' AND EXISTS(SELECT 1 FROM calendar_connections cc JOIN accounts ca ON ca.id=cc.account_id WHERE ca.role='tutor' AND ca.status='active' AND ca.must_change_password=0 AND cc.encrypted_credentials IS NOT NULL AND cc.selected_calendars!='[]' AND (
 NOT EXISTS(SELECT 1 FROM calendar_busy_cache bc WHERE bc.account_id=cc.account_id AND bc.settings_version=cc.version AND bc.starts_at<=NEW.starts_at AND bc.ends_at>=NEW.ends_at AND bc.checked_at>=(julianday('now')-2440587.5)*86400000-180000)
 OR EXISTS(SELECT 1 FROM calendar_busy_cache bc,json_each(bc.intervals) j WHERE bc.account_id=cc.account_id AND bc.settings_version=cc.version AND julianday(json_extract(j.value,'$.start'))<julianday(NEW.ends_at)+5.0/1440 AND julianday(json_extract(j.value,'$.end'))>julianday(NEW.starts_at)-5.0/1440))) BEGIN SELECT RAISE(ABORT,'ICLOUD_SLOT_UNAVAILABLE'); END;

--> statement-breakpoint
CREATE TRIGGER automatic_booking_claim BEFORE UPDATE OF status ON booking_slots WHEN NEW.status='held' AND OLD.status='available' AND NOT (NEW.recurrence_id IS NULL OR EXISTS(SELECT 1 FROM consultation_recurrence r WHERE r.id=NEW.recurrence_id AND r.active=1 AND r.lessons_enabled=1 AND r.version=NEW.generated_version)) BEGIN SELECT RAISE(ABORT,'AUTOMATIC_SLOT_CHANGED'); END;

--> statement-breakpoint
CREATE TRIGGER automatic_consultation_claim BEFORE INSERT ON consultations WHEN NEW.status='confirmed' AND NOT EXISTS(SELECT 1 FROM consultation_slots s WHERE s.id=NEW.slot_id AND (s.recurrence_id IS NULL OR EXISTS(SELECT 1 FROM consultation_recurrence r WHERE r.id=s.recurrence_id AND r.active=1 AND r.consultations_enabled=1 AND r.version=s.generated_version))) BEGIN SELECT RAISE(ABORT,'AUTOMATIC_SLOT_CHANGED'); END;

--> statement-breakpoint
UPDATE consultation_recurrence SET generated_until=NULL,paid_generated_until=NULL;
