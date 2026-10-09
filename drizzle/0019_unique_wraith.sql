CREATE TABLE `lesson_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`amount` integer NOT NULL,
	`units` integer NOT NULL,
	`unit_amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'awaiting' NOT NULL,
	`paid_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lesson_packages_student` ON `lesson_packages` (`student_id`);--> statement-breakpoint
CREATE TABLE `package_uses` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_package_uses_package` ON `package_uses` (`package_id`);--> statement-breakpoint
CREATE INDEX `idx_package_uses_payment` ON `package_uses` (`payment_id`);--> statement-breakpoint
CREATE TRIGGER package_use_guard BEFORE INSERT ON package_uses WHEN NEW.status!='applied' OR NOT EXISTS(SELECT 1 FROM lesson_packages k JOIN students s ON s.id=k.student_id JOIN lesson_payments p ON p.id=NEW.payment_id AND p.student_id=k.student_id JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE k.id=NEW.package_id AND k.status='active' AND k.paid_at IS NOT NULL AND k.units=5 AND k.amount=9500 AND k.unit_amount=1900 AND s.status='active' AND (SELECT COUNT(*) FROM package_uses x WHERE x.package_id=k.id AND x.status='applied')<k.units AND l.status='planned' AND julianday(l.starts_at)>julianday('now') AND l.payment_status='awaiting' AND l.payment_method IN ('cash','pos') AND p.status='awaiting' AND p.amount=2000 AND p.stripe_session IS NULL AND p.attempt_key IS NULL AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id)=1 AND NOT EXISTS(SELECT 1 FROM referral_redemptions r WHERE r.payment_id=p.id AND r.status='applied') AND NOT EXISTS(SELECT 1 FROM package_uses x WHERE x.payment_id=p.id AND x.status='applied')) BEGIN SELECT RAISE(ABORT,'PACKAGE_UNAVAILABLE'); END;
--> statement-breakpoint
CREATE TRIGGER package_use_apply_payment AFTER INSERT ON package_uses BEGIN UPDATE lesson_payments SET amount=1900,status='manual_paid',paid_at=(SELECT paid_at FROM lesson_packages WHERE id=NEW.package_id) WHERE id=NEW.payment_id; END;
--> statement-breakpoint
CREATE TRIGGER package_use_apply_lesson AFTER INSERT ON package_uses BEGIN UPDATE scheduled_lessons SET payment_status='paid',paid_at=(SELECT paid_at FROM lesson_packages WHERE id=NEW.package_id),version=version+1 WHERE id=(SELECT lesson_id FROM lesson_payments WHERE id=NEW.payment_id); END;
--> statement-breakpoint
CREATE TRIGGER package_use_return_payment AFTER UPDATE OF status ON package_uses WHEN OLD.status='applied' AND NEW.status='returned' BEGIN UPDATE lesson_payments SET amount=2000,status='awaiting',paid_at=NULL WHERE id=OLD.payment_id AND EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.id=lesson_payments.lesson_id AND l.status='planned'); END;
--> statement-breakpoint
CREATE TRIGGER package_use_return_lesson AFTER UPDATE OF status ON package_uses WHEN OLD.status='applied' AND NEW.status='returned' BEGIN UPDATE scheduled_lessons SET payment_status='awaiting',paid_at=NULL,version=version+1 WHERE status='planned' AND id=(SELECT lesson_id FROM lesson_payments WHERE id=OLD.payment_id); END;
--> statement-breakpoint
CREATE TRIGGER package_cancelled_lesson AFTER UPDATE OF status ON scheduled_lessons WHEN NEW.status IN ('cancelled','expired') AND OLD.status='planned' BEGIN UPDATE package_uses SET status='returned' WHERE status='applied' AND payment_id IN (SELECT id FROM lesson_payments WHERE lesson_id=NEW.id); END;
--> statement-breakpoint
CREATE TRIGGER package_payment_method BEFORE UPDATE OF payment_method ON scheduled_lessons WHEN NEW.payment_method NOT IN ('cash','pos') AND EXISTS(SELECT 1 FROM package_uses x JOIN lesson_payments p ON p.id=x.payment_id WHERE p.lesson_id=NEW.id AND x.status='applied') BEGIN SELECT RAISE(ABORT,'PACKAGE_PAYMENT_METHOD'); END;
