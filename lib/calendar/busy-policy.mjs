// Missing/stale Apple readings close availability rather than advertise busy times.
export function calendarBusySql(alias='s'){
 return `EXISTS(SELECT 1 FROM calendar_connections cc JOIN accounts ca ON ca.id=cc.account_id WHERE ca.role='tutor' AND ca.status='active' AND ca.must_change_password=0 AND cc.encrypted_credentials IS NOT NULL AND cc.selected_calendars!='[]' AND (
 NOT EXISTS(SELECT 1 FROM calendar_busy_cache bc WHERE bc.account_id=cc.account_id AND bc.settings_version=cc.version AND bc.starts_at<=${alias}.starts_at AND bc.ends_at>=${alias}.ends_at AND bc.checked_at>=(julianday('now')-2440587.5)*86400000-180000)
 OR EXISTS(SELECT 1 FROM calendar_busy_cache bc,json_each(bc.intervals) j WHERE bc.account_id=cc.account_id AND bc.settings_version=cc.version AND julianday(json_extract(j.value,'$.start'))<julianday(${alias}.ends_at)+5.0/1440 AND julianday(json_extract(j.value,'$.end'))>julianday(${alias}.starts_at)-5.0/1440)))`;
}
