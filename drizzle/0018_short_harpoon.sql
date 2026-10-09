CREATE TABLE `referral_codes` (
	`student_id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_referral_codes_code` ON `referral_codes` (`code`);--> statement-breakpoint
CREATE TABLE `referral_credits` (
	`id` text PRIMARY KEY NOT NULL,
	`referral_id` text NOT NULL,
	`student_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_referral_credits_recipient` ON `referral_credits` (`referral_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_referral_credits_student` ON `referral_credits` (`student_id`);--> statement-breakpoint
CREATE TABLE `referral_qualifications` (
	`referral_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	PRIMARY KEY(`referral_id`, `lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `referral_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`credit_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_referral_redemptions_credit` ON `referral_redemptions` (`credit_id`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text NOT NULL,
	`invited_id` text NOT NULL,
	`request_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reward_kind` text,
	`award_key` text,
	`qualified_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_referrals_invited` ON `referrals` (`invited_id`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer` ON `referrals` (`referrer_id`);
--> statement-breakpoint
CREATE TRIGGER referral_redemption_guard BEFORE INSERT ON referral_redemptions WHEN NEW.status!='applied' OR NEW.amount!=500 OR NOT EXISTS(SELECT 1 FROM referral_credits c JOIN referrals r ON r.id=c.referral_id JOIN students s ON s.id=c.student_id JOIN lesson_payments pay ON pay.id=NEW.payment_id AND pay.student_id=c.student_id JOIN scheduled_lessons lesson ON lesson.id=pay.lesson_id WHERE c.id=NEW.credit_id AND c.status='active' AND r.status='rewarded' AND c.kind=r.reward_kind AND s.status='active' AND julianday(c.expires_at)>julianday('now') AND (SELECT COUNT(*) FROM referral_qualifications q JOIN scheduled_lessons l ON l.id=q.lesson_id JOIN lesson_payments p ON p.lesson_id=l.id AND p.student_id=r.invited_id WHERE q.referral_id=r.id AND l.status='planned' AND julianday(l.ends_at)<=julianday('now') AND julianday(l.starts_at)>=julianday(r.created_at)
 AND l.payment_method IN ('cash','pos') AND p.status='manual_paid' AND p.paid_at IS NOT NULL AND p.amount>0
 AND ((r.reward_kind='individual' AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id)=1)
 OR (r.reward_kind='group' AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id) BETWEEN 2 AND 4
 AND EXISTS(SELECT 1 FROM lesson_payments sender WHERE sender.lesson_id=l.id AND sender.student_id=r.referrer_id AND sender.status='manual_paid' AND sender.paid_at IS NOT NULL AND sender.amount>0))))=3 AND c.amount-COALESCE((SELECT SUM(x.amount) FROM referral_redemptions x WHERE x.credit_id=c.id AND x.status='applied'),0)>=NEW.amount AND lesson.status='planned' AND julianday(lesson.starts_at)>julianday('now') AND lesson.payment_method IN ('cash','pos') AND pay.status='awaiting' AND pay.stripe_session IS NULL AND pay.attempt_key IS NULL AND pay.amount=CASE WHEN (SELECT COUNT(*) FROM lesson_payments pp WHERE pp.lesson_id=lesson.id)=1 THEN 2000 ELSE 1500 END AND (c.kind='individual' OR (SELECT COUNT(*) FROM lesson_payments pp WHERE pp.lesson_id=lesson.id) BETWEEN 2 AND 4) AND NOT EXISTS(SELECT 1 FROM referral_redemptions x WHERE x.payment_id=pay.id AND x.status='applied')) BEGIN SELECT RAISE(ABORT,'REFERRAL_CREDIT_UNAVAILABLE'); END;
--> statement-breakpoint
CREATE TRIGGER referral_redemption_apply AFTER INSERT ON referral_redemptions BEGIN UPDATE lesson_payments SET amount=amount-NEW.amount WHERE id=NEW.payment_id; END;
--> statement-breakpoint
CREATE TRIGGER referral_redemption_return AFTER UPDATE OF status ON referral_redemptions WHEN OLD.status='applied' AND NEW.status='returned' BEGIN UPDATE lesson_payments SET amount=amount+OLD.amount WHERE id=OLD.payment_id AND status='awaiting' AND stripe_session IS NULL; END;
--> statement-breakpoint
CREATE TRIGGER referral_cancelled_lesson AFTER UPDATE OF status ON scheduled_lessons WHEN NEW.status IN ('cancelled','expired') AND OLD.status='planned' BEGIN UPDATE referral_redemptions SET status='returned' WHERE status='applied' AND payment_id IN (SELECT id FROM lesson_payments WHERE lesson_id=NEW.id); END;
--> statement-breakpoint
CREATE TRIGGER referral_discount_payment_method BEFORE UPDATE OF payment_method ON scheduled_lessons WHEN NEW.payment_method NOT IN ('cash','pos') AND EXISTS(SELECT 1 FROM referral_redemptions x JOIN lesson_payments p ON p.id=x.payment_id WHERE p.lesson_id=NEW.id AND x.status='applied') BEGIN SELECT RAISE(ABORT,'REFERRAL_CREDIT_PAYMENT_METHOD'); END;
