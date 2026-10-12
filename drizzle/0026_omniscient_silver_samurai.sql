ALTER TABLE `bookings` ADD `cancelled_by` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_requested_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellation_refund_percent` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `checkout_paypal` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_packages` ADD `checkout_paypal` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_payments` ADD `checkout_paypal` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `cancelled_by` text;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `cancellation_requested_at` text;--> statement-breakpoint
ALTER TABLE `scheduled_lessons` ADD `cancellation_refund_percent` integer;--> statement-breakpoint
DROP TRIGGER package_cancelled_lesson;
--> statement-breakpoint
CREATE TRIGGER package_cancelled_lesson AFTER UPDATE OF status ON scheduled_lessons
WHEN NEW.status IN ('cancelled','expired') AND OLD.status='planned' AND NEW.cancellation_refund_percent IS NULL
BEGIN
 UPDATE package_uses SET status='returned' WHERE status='applied' AND payment_id IN (SELECT id FROM lesson_payments WHERE lesson_id=NEW.id);
END;
