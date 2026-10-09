// Explicit columns: additions to the database never enter a download implicitly.
export const exportTables={
 requests:'id kind name email subject details assessment student_id group_id status created_at consent_version',
 request_followups:'request_id last_contact_at next_action next_action_date source notes version updated_at',
 tutor_templates:'id name kind content status version created_at updated_at',
 students:'id name email phone contact_name school notes notifications status created_at updated_at',
 student_groups:'id name subject notes status created_at updated_at',group_members:'group_id student_id',
 booking_slots:'id starts_at ends_at mode status booking_id',
 bookings:'id slot_id name email subject student_id video_url version status created_at',
 scheduled_lessons:'id series_id name email subject starts_at ends_at mode notes student_id group_id video_url version payment_method payment_status paid_at status created_at',
 lesson_payments:'id lesson_id student_id name email amount status paid_at created_at',
 lesson_packages:'id student_id amount units unit_amount payment_method status paid_at created_at',package_uses:'id package_id payment_id status created_at',
 consultation_recurrence:'id start_date from_time to_time mode active version generated_until created_at updated_at',
 consultation_slots:'id starts_at ends_at mode status recurrence_id created_at',
 consultations:'id slot_id request_id name email phone subject student_type message mode starts_at ends_at status version created_at',
 courses:'id title subject description status created_at updated_at',course_modules:'id course_id title position',
 course_materials:'id module_id title kind body object_key filename mime size status position created_at',
 course_enrollments:'student_id course_id status created_at',material_progress:'student_id material_id completed_at',
 study_plans:'id student_id title subject objective target_date starting_point topics next_steps status version created_at updated_at',
 lesson_summaries:'id student_id appointment_kind appointment_id title topics practice next_steps status version created_at updated_at',
 homework_assignments:'id student_id plan_id title subject instructions due_date status object_key filename mime size version created_at updated_at',
 homework_submissions:'id assignment_id submitted_by attempt body object_key filename mime size feedback feedback_status review_status version created_at reviewed_at',
 matching_proposals:'id name subject mode availability notes checks members status group_id created_at updated_at',
 referral_codes:'student_id code created_at',referrals:'id referrer_id invited_id request_id status reward_kind qualified_at created_at',
 referral_qualifications:'referral_id lesson_id',referral_credits:'id referral_id student_id kind amount status expires_at created_at',referral_redemptions:'id credit_id payment_id amount status created_at',
 accounts:'id email name role status must_change_password created_at updated_at',account_student_access:'account_id student_id status created_at',
 // Message bodies/payloads may contain payment links. Export only the log metadata.
 notifications:'id event_key student_id entity_type entity_id kind recipient subject status created_at updated_at',
} as const;
export const exportLimits={rows:20000,bytes:10*1024*1024,tableBytes:1800000};
export const exportExclusions=['Password e sessioni di accesso','Token delle prenotazioni e dei pagamenti, identificativi tecnici Stripe','Contatori degli accessi e degli invii','Corpo e dettagli tecnici delle notifiche','File allegati e video: sono inclusi soltanto i riferimenti'];
// D1 has stricter query/function limits than Node SQLite. Avoid compound
// SELECTs; build JSON in chunks to keep each function under 32 arguments.
function object(fields:string){
 const columns=fields.split(' ');let sql=`json_object(${columns.slice(0,16).map(field=>`'${field}',${field}`).join(',')})`;
 for(let i=16;i<columns.length;i+=15)sql=`json_set(${sql},${columns.slice(i,i+15).map(field=>`'$.${field}',${field}`).join(',')})`;
 return sql;
}
export const countQuery=`SELECT ${Object.keys(exportTables).map(table=>`(SELECT COUNT(*) FROM ${table}) AS ${table}`).join(',')}`;
// One read statement gives a consistent snapshot. Check every budget before
// returning data; oversized exports produce an error, never a partial file.
export const exportQuery=`WITH stats(name,count,bytes) AS MATERIALIZED (VALUES ${Object.entries(exportTables).map(([table,fields])=>`('${table}',(SELECT COUNT(*) FROM ${table}),(SELECT COALESCE(SUM(length(CAST(${object(fields)} AS BLOB))),0) FROM ${table}))`).join(',')}), budget AS (SELECT SUM(count)<=${exportLimits.rows} AND SUM(bytes)<=${exportLimits.bytes} AND MAX(bytes+2*count)<=${exportLimits.tableBytes} AS allowed FROM stats) SELECT name,count,bytes,CASE WHEN (SELECT allowed FROM budget) THEN CASE name ${Object.entries(exportTables).map(([table,fields])=>`WHEN '${table}' THEN (SELECT json_group_array(${object(fields)}) FROM ${table})`).join(' ')} END ELSE NULL END AS data FROM stats`;
