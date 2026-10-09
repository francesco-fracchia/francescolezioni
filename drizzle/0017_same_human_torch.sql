CREATE TABLE `consultation_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_consultation_slots_start` ON `consultation_slots` (`starts_at`);--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`request_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`subject` text NOT NULL,
	`student_type` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`mode` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`payload_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_consultations_slot_status` ON `consultations` (`slot_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_consultations_status_start` ON `consultations` (`status`,`starts_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_consultations_confirmed_slot ON consultations(slot_id) WHERE status='confirmed';
--> statement-breakpoint
CREATE TRIGGER consultations_slot_insert_guard BEFORE INSERT ON consultations WHEN NEW.status='confirmed' AND (NOT EXISTS(SELECT 1 FROM consultation_slots WHERE id=NEW.slot_id AND status='available' AND starts_at=NEW.starts_at AND ends_at=NEW.ends_at AND (mode=NEW.mode OR mode='Entrambe'))) BEGIN SELECT RAISE(ABORT,'CONSULTATION_SLOT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER consultations_conflict_insert_guard BEFORE INSERT ON consultations WHEN NEW.status='confirmed' AND (EXISTS(SELECT 1 FROM consultations c WHERE c.status='confirmed' AND c.id!=NEW.id AND julianday(c.starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(c.ends_at)>julianday(NEW.starts_at)-5.0/1440) OR EXISTS(SELECT 1 FROM booking_slots s WHERE s.status!='available' AND julianday(s.starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(s.ends_at)>julianday(NEW.starts_at)-5.0/1440) OR EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.status='planned' AND julianday(l.starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(l.ends_at)>julianday(NEW.starts_at)-5.0/1440)) BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER consultations_slot_update_guard BEFORE UPDATE OF status,starts_at,ends_at,slot_id,mode ON consultations WHEN NEW.status='confirmed' AND (NOT EXISTS(SELECT 1 FROM consultation_slots WHERE id=NEW.slot_id AND status='available' AND starts_at=NEW.starts_at AND ends_at=NEW.ends_at AND (mode=NEW.mode OR mode='Entrambe'))) BEGIN SELECT RAISE(ABORT,'CONSULTATION_SLOT_CHANGED'); END;
--> statement-breakpoint
CREATE TRIGGER consultations_conflict_update_guard BEFORE UPDATE OF status,starts_at,ends_at,slot_id,mode ON consultations WHEN NEW.status='confirmed' AND (EXISTS(SELECT 1 FROM consultations c WHERE c.status='confirmed' AND c.id!=NEW.id AND julianday(c.starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(c.ends_at)>julianday(NEW.starts_at)-5.0/1440) OR EXISTS(SELECT 1 FROM booking_slots s WHERE s.status!='available' AND julianday(s.starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(s.ends_at)>julianday(NEW.starts_at)-5.0/1440) OR EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.status='planned' AND julianday(l.starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(l.ends_at)>julianday(NEW.starts_at)-5.0/1440)) BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER consultation_lesson_insert BEFORE INSERT ON scheduled_lessons WHEN NEW.status='planned' AND EXISTS(SELECT 1 FROM consultations WHERE status='confirmed' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440) BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER consultation_lesson_update BEFORE UPDATE OF status,starts_at,ends_at ON scheduled_lessons WHEN NEW.status='planned' AND EXISTS(SELECT 1 FROM consultations WHERE status='confirmed' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440) BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER consultation_paid_slot_insert BEFORE INSERT ON booking_slots WHEN NEW.status!='available' AND EXISTS(SELECT 1 FROM consultations WHERE status='confirmed' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440) BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER consultation_paid_slot_update BEFORE UPDATE OF status,starts_at,ends_at ON booking_slots WHEN NEW.status!='available' AND EXISTS(SELECT 1 FROM consultations WHERE status='confirmed' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440) BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
