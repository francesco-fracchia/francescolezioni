import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
export const requests = sqliteTable('requests', {
 id: text('id').primaryKey(), kind: text('kind').notNull(), name: text('name').notNull(), email: text('email').notNull(),
 subject: text('subject').notNull(), details: text('details').notNull(), assessment: text('assessment'), studentId:text('student_id'),groupId:text('group_id'),
 status: text('status').notNull().default('new'), createdAt: text('created_at').notNull(), consentVersion: text('consent_version').notNull()
});
export const requestFollowups=sqliteTable('request_followups',{
 requestId:text('request_id').primaryKey(),lastContactAt:text('last_contact_at'),nextAction:text('next_action').notNull().default(''),nextActionDate:text('next_action_date'),source:text('source').notNull().default('unknown'),notes:text('notes').notNull().default(''),version:integer('version').notNull().default(0),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_request_followups_date').on(t.nextActionDate)]);
export const tutorTemplates=sqliteTable('tutor_templates',{
 id:text('id').primaryKey(),name:text('name').notNull(),kind:text('kind').notNull(),content:text('content').notNull(),status:text('status').notNull().default('active'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});

export const bookingSlots = sqliteTable('booking_slots', {
 id:text('id').primaryKey(), startsAt:text('starts_at').notNull(), endsAt:text('ends_at').notNull(), mode:text('mode').notNull(),
 status:text('status').notNull().default('available'), bookingId:text('booking_id'),
});
export const bookings = sqliteTable('bookings', {
 id:text('id').primaryKey(), slotId:text('slot_id').notNull(), accessToken:text('access_token').notNull(), name:text('name').notNull(), email:text('email').notNull(), subject:text('subject').notNull(),
 studentId:text('student_id'), videoUrl:text('video_url'), version:integer('version').notNull().default(0),operationId:text('operation_id'), status:text('status').notNull().default('pending'), stripeSession:text('stripe_session'),checkoutExpiresAt:integer('checkout_expires_at'), createdAt:text('created_at').notNull(),
});

export const scheduledLessons = sqliteTable('scheduled_lessons', {
 id:text('id').primaryKey(), seriesId:text('series_id').notNull(), name:text('name').notNull(), email:text('email').notNull(), subject:text('subject').notNull(),
 startsAt:text('starts_at').notNull(), endsAt:text('ends_at').notNull(), mode:text('mode').notNull(), notes:text('notes').notNull(),
 studentId:text('student_id'), groupId:text('group_id'), videoUrl:text('video_url'), version:integer('version').notNull().default(0),operationId:text('operation_id'), paymentMethod:text('payment_method').notNull().default('legacy'), paymentStatus:text('payment_status').notNull().default('unverified'), paidAt:text('paid_at'),
 status:text('status').notNull().default('planned'), createdAt:text('created_at').notNull(),
});

export const lessonPayments = sqliteTable('lesson_payments', {
 id:text('id').primaryKey(), lessonId:text('lesson_id').notNull(), accessToken:text('access_token').notNull(),
 studentId:text('student_id'), name:text('name').notNull(), email:text('email').notNull(), amount:integer('amount').notNull(),
 status:text('status').notNull().default('awaiting'), stripeSession:text('stripe_session'), attemptKey:text('attempt_key'), checkoutExpiresAt:integer('checkout_expires_at'),
 paidAt:text('paid_at'), createdAt:text('created_at').notNull(),
}, table => [index('idx_lesson_payments_lesson').on(table.lessonId)]);

export const students=sqliteTable('students',{
 id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull(),phone:text('phone').notNull().default(''),
 contactName:text('contact_name').notNull().default(''),school:text('school').notNull().default(''),notes:text('notes').notNull().default(''),
 notifications:integer('notifications').notNull().default(1),status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('idx_students_name_email').on(t.name,t.email)]);
export const studentGroups=sqliteTable('student_groups',{
 id:text('id').primaryKey(),name:text('name').notNull(),subject:text('subject').notNull(),notes:text('notes').notNull().default(''),
 status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const groupMembers=sqliteTable('group_members',{groupId:text('group_id').notNull(),studentId:text('student_id').notNull()},t=>[primaryKey({columns:[t.groupId,t.studentId]})]);
export const notifications=sqliteTable('notifications',{
 id:text('id').primaryKey(),eventKey:text('event_key').notNull(),studentId:text('student_id'),entityType:text('entity_type').notNull(),entityId:text('entity_id').notNull(),kind:text('kind').notNull(),
 recipient:text('recipient').notNull(),subject:text('subject').notNull(),body:text('body').notNull(),payload:text('payload').notNull(),
 status:text('status').notNull(),providerId:text('provider_id'),error:text('error'),firstAttemptAt:text('first_attempt_at'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('idx_notifications_event').on(t.eventKey),index('idx_notifications_status').on(t.status)]);

export const studentAccess=sqliteTable('student_access',{
 id:text('id').primaryKey(),studentId:text('student_id').notNull(),email:text('email').notNull(),userId:text('user_id'),role:text('role').notNull(),status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_student_access_student_email').on(t.studentId,t.email),index('idx_student_access_email').on(t.email),index('idx_student_access_user').on(t.userId)]);
export const courses=sqliteTable('courses',{
 id:text('id').primaryKey(),title:text('title').notNull(),subject:text('subject').notNull(),description:text('description').notNull().default(''),status:text('status').notNull().default('draft'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const courseModules=sqliteTable('course_modules',{
 id:text('id').primaryKey(),courseId:text('course_id').notNull(),title:text('title').notNull(),position:integer('position').notNull().default(0),
},t=>[index('idx_course_modules_course').on(t.courseId)]);
export const courseMaterials=sqliteTable('course_materials',{
 id:text('id').primaryKey(),moduleId:text('module_id').notNull(),title:text('title').notNull(),kind:text('kind').notNull(),body:text('body').notNull().default(''),objectKey:text('object_key'),filename:text('filename'),mime:text('mime'),size:integer('size'),status:text('status').notNull().default('draft'),position:integer('position').notNull().default(0),createdAt:text('created_at').notNull(),
},t=>[index('idx_course_materials_module').on(t.moduleId)]);
export const courseEnrollments=sqliteTable('course_enrollments',{
 studentId:text('student_id').notNull(),courseId:text('course_id').notNull(),status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.studentId,t.courseId]})]);
export const materialProgress=sqliteTable('material_progress',{
 studentId:text('student_id').notNull(),materialId:text('material_id').notNull(),completedAt:text('completed_at').notNull(),
},t=>[primaryKey({columns:[t.studentId,t.materialId]})]);

export const matchingProposals=sqliteTable('matching_proposals',{
 id:text('id').primaryKey(),name:text('name').notNull(),subject:text('subject').notNull(),mode:text('mode').notNull(),availability:text('availability').notNull(),notes:text('notes').notNull(),checks:text('checks').notNull(),members:text('members').notNull(),status:text('status').notNull().default('draft'),groupId:text('group_id'),approvalKey:text('approval_key'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});

export const accounts=sqliteTable('accounts',{
 id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),role:text('role').notNull(),status:text('status').notNull().default('active'),passwordHash:text('password_hash').notNull(),mustChangePassword:integer('must_change_password').notNull().default(1),authVersion:integer('auth_version').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('idx_accounts_email').on(t.email)]);
export const accountSessions=sqliteTable('account_sessions',{
 tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull(),authVersion:integer('auth_version').notNull(),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('idx_account_sessions_account').on(t.accountId)]);
export const accountStudentAccess=sqliteTable('account_student_access',{
 accountId:text('account_id').notNull(),studentId:text('student_id').notNull(),status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.accountId,t.studentId]})]);
export const authAttempts=sqliteTable('auth_attempts',{
 key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull(),
});
export const publicRequestLimits=sqliteTable('public_request_limits',{
 key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_public_request_limits_expiry').on(t.expiresAt)]);

export const consultationRecurrence=sqliteTable('consultation_recurrence',{
 id:text('id').primaryKey(),startDate:text('start_date').notNull(),fromTime:text('from_time').notNull(),toTime:text('to_time').notNull(),mode:text('mode').notNull(),active:integer('active').notNull().default(1),version:integer('version').notNull().default(0),generatedUntil:text('generated_until'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const consultationSlots=sqliteTable('consultation_slots',{
 recurrenceId:text('recurrence_id'),id:text('id').primaryKey(),startsAt:text('starts_at').notNull(),endsAt:text('ends_at').notNull(),mode:text('mode').notNull(),status:text('status').notNull().default('available'),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_consultation_slots_start').on(t.startsAt)]);
export const consultations=sqliteTable('consultations',{
 id:text('id').primaryKey(),slotId:text('slot_id').notNull(),requestId:text('request_id').notNull(),name:text('name').notNull(),email:text('email').notNull(),phone:text('phone').notNull().default(''),subject:text('subject').notNull(),studentType:text('student_type').notNull(),message:text('message').notNull().default(''),mode:text('mode').notNull(),startsAt:text('starts_at').notNull(),endsAt:text('ends_at').notNull(),status:text('status').notNull().default('confirmed'),version:integer('version').notNull().default(0),payloadHash:text('payload_hash').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('idx_consultations_slot_status').on(t.slotId,t.status),index('idx_consultations_status_start').on(t.status,t.startsAt)]);

export const studyPlans=sqliteTable('study_plans',{
 id:text('id').primaryKey(),studentId:text('student_id').notNull(),title:text('title').notNull(),subject:text('subject').notNull(),objective:text('objective').notNull(),targetDate:text('target_date'),startingPoint:text('starting_point').notNull().default(''),topics:text('topics').notNull().default(''),nextSteps:text('next_steps').notNull().default(''),status:text('status').notNull().default('draft'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_study_plans_student').on(t.studentId,t.status)]);
export const lessonSummaries=sqliteTable('lesson_summaries',{
 id:text('id').primaryKey(),studentId:text('student_id').notNull(),appointmentKind:text('appointment_kind').notNull(),appointmentId:text('appointment_id').notNull(),title:text('title').notNull(),topics:text('topics').notNull(),practice:text('practice').notNull().default(''),nextSteps:text('next_steps').notNull().default(''),status:text('status').notNull().default('draft'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('idx_lesson_summaries_student_appointment').on(t.studentId,t.appointmentKind,t.appointmentId),index('idx_lesson_summaries_student').on(t.studentId,t.status)]);

export const homeworkAssignments=sqliteTable('homework_assignments',{
 id:text('id').primaryKey(),studentId:text('student_id').notNull(),planId:text('plan_id'),title:text('title').notNull(),subject:text('subject').notNull(),instructions:text('instructions').notNull(),dueDate:text('due_date'),status:text('status').notNull().default('draft'),objectKey:text('object_key'),filename:text('filename'),mime:text('mime'),size:integer('size'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_homework_assignments_student').on(t.studentId,t.status)]);
export const homeworkSubmissions=sqliteTable('homework_submissions',{
 id:text('id').primaryKey(),assignmentId:text('assignment_id').notNull(),submittedBy:text('submitted_by').notNull(),attempt:integer('attempt').notNull(),body:text('body').notNull().default(''),objectKey:text('object_key'),filename:text('filename'),mime:text('mime'),size:integer('size'),contentHash:text('content_hash').notNull(),feedback:text('feedback').notNull().default(''),feedbackStatus:text('feedback_status').notNull().default('draft'),reviewStatus:text('review_status').notNull().default('pending'),version:integer('version').notNull().default(0),createdAt:text('created_at').notNull(),reviewedAt:text('reviewed_at'),
},t=>[uniqueIndex('idx_homework_submissions_attempt').on(t.assignmentId,t.attempt)]);

export const referralCodes=sqliteTable('referral_codes',{
 studentId:text('student_id').primaryKey(),code:text('code').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_referral_codes_code').on(t.code)]);
export const referrals=sqliteTable('referrals',{
 id:text('id').primaryKey(),referrerId:text('referrer_id').notNull(),invitedId:text('invited_id').notNull(),requestId:text('request_id'),
 status:text('status').notNull().default('pending'),rewardKind:text('reward_kind'),awardKey:text('award_key'),qualifiedAt:text('qualified_at'),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_referrals_invited').on(t.invitedId),index('idx_referrals_referrer').on(t.referrerId)]);
export const referralQualifications=sqliteTable('referral_qualifications',{
 referralId:text('referral_id').notNull(),lessonId:text('lesson_id').notNull(),
},t=>[primaryKey({columns:[t.referralId,t.lessonId]})]);
export const referralCredits=sqliteTable('referral_credits',{
 id:text('id').primaryKey(),referralId:text('referral_id').notNull(),studentId:text('student_id').notNull(),kind:text('kind').notNull(),amount:integer('amount').notNull(),
 status:text('status').notNull().default('active'),expiresAt:text('expires_at').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('idx_referral_credits_recipient').on(t.referralId,t.studentId),index('idx_referral_credits_student').on(t.studentId)]);
export const referralRedemptions=sqliteTable('referral_redemptions',{
 id:text('id').primaryKey(),creditId:text('credit_id').notNull(),paymentId:text('payment_id').notNull(),amount:integer('amount').notNull(),
 status:text('status').notNull().default('applied'),createdAt:text('created_at').notNull(),
},t=>[index('idx_referral_redemptions_credit').on(t.creditId)]);

export const lessonPackages=sqliteTable('lesson_packages',{
 id:text('id').primaryKey(),studentId:text('student_id').notNull(),amount:integer('amount').notNull(),units:integer('units').notNull(),unitAmount:integer('unit_amount').notNull(),paymentMethod:text('payment_method').notNull(),status:text('status').notNull().default('awaiting'),paidAt:text('paid_at'),createdAt:text('created_at').notNull(),stripeSession:text('stripe_session'),checkoutExpiresAt:integer('checkout_expires_at'),liveMode:integer('live_mode').notNull().default(0),
},t=>[index('idx_lesson_packages_student').on(t.studentId)]);
export const packageUses=sqliteTable('package_uses',{
 id:text('id').primaryKey(),packageId:text('package_id').notNull(),paymentId:text('payment_id').notNull(),status:text('status').notNull().default('applied'),createdAt:text('created_at').notNull(),
},t=>[index('idx_package_uses_package').on(t.packageId),index('idx_package_uses_payment').on(t.paymentId)]);
