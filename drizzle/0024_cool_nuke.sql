ALTER TABLE `lesson_packages` ADD `stripe_session` text;--> statement-breakpoint
ALTER TABLE `lesson_packages` ADD `checkout_expires_at` integer;
--> statement-breakpoint
DROP TRIGGER package_use_guard;
--> statement-breakpoint
CREATE TRIGGER package_use_guard BEFORE INSERT ON package_uses WHEN NEW.status!='applied' OR NOT EXISTS(SELECT 1 FROM lesson_packages k JOIN students s ON s.id=k.student_id JOIN lesson_payments p ON p.id=NEW.payment_id AND p.student_id=k.student_id JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE k.id=NEW.package_id AND k.status='active' AND k.paid_at IS NOT NULL AND ((k.units=5 AND k.amount=9500 AND k.unit_amount=1900) OR (k.units=1 AND k.amount=2000 AND k.unit_amount=2000 AND k.payment_method='online')) AND s.status='active' AND (SELECT COUNT(*) FROM package_uses x WHERE x.package_id=k.id AND x.status='applied')<k.units AND l.status='planned' AND julianday(l.starts_at)>julianday('now') AND l.payment_status='awaiting' AND (l.payment_method IN ('cash','pos') OR (l.payment_method='online' AND k.payment_method='online')) AND p.status='awaiting' AND p.amount=2000 AND p.stripe_session IS NULL AND p.attempt_key IS NULL AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id)=1 AND NOT EXISTS(SELECT 1 FROM referral_redemptions r WHERE r.payment_id=p.id AND r.status='applied') AND NOT EXISTS(SELECT 1 FROM package_uses x WHERE x.payment_id=p.id AND x.status='applied')) BEGIN SELECT RAISE(ABORT,'PACKAGE_UNAVAILABLE'); END;

--> statement-breakpoint
DROP TRIGGER package_use_apply_payment;
--> statement-breakpoint
CREATE TRIGGER package_use_apply_payment AFTER INSERT ON package_uses BEGIN UPDATE lesson_payments SET amount=(SELECT unit_amount FROM lesson_packages WHERE id=NEW.package_id),status=CASE WHEN (SELECT payment_method FROM lesson_packages WHERE id=NEW.package_id)='online' THEN 'paid' ELSE 'manual_paid' END,paid_at=(SELECT paid_at FROM lesson_packages WHERE id=NEW.package_id) WHERE id=NEW.payment_id; END;
