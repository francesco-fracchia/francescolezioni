export function automaticSlotEnabledSql(alias='s',kind='paid'){
 return `(${alias}.recurrence_id IS NULL OR EXISTS(SELECT 1 FROM consultation_recurrence r WHERE r.id=${alias}.recurrence_id AND r.active=1 AND r.${kind==='paid'?'lessons_enabled':'consultations_enabled'}=1 AND r.version=${alias}.generated_version))`;
}
