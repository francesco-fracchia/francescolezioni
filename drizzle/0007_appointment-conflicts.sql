CREATE TRIGGER scheduled_lessons_move_conflict BEFORE UPDATE OF starts_at,ends_at ON scheduled_lessons
WHEN NEW.status='planned' AND (
 EXISTS(SELECT 1 FROM booking_slots WHERE status!='available' AND booking_id IS NOT NEW.id AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440)
 OR EXISTS(SELECT 1 FROM scheduled_lessons WHERE id!=NEW.id AND status='planned' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440)
)
BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER booking_slots_claim_conflict BEFORE UPDATE OF status,starts_at,ends_at ON booking_slots
WHEN NEW.status IN ('held','booked','scheduled') AND (
 EXISTS(SELECT 1 FROM booking_slots WHERE id!=NEW.id AND booking_id IS NOT NEW.booking_id AND status!='available' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440)
 OR EXISTS(SELECT 1 FROM scheduled_lessons WHERE id IS NOT NEW.booking_id AND status='planned' AND julianday(starts_at)<julianday(NEW.ends_at)+5.0/1440 AND julianday(ends_at)>julianday(NEW.starts_at)-5.0/1440)
)
BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;
