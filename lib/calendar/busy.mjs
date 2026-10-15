import {CalendarError,openCalendarValue} from './security.mjs';
import {calendarSelection} from './settings.mjs';
import {iCloudClient,discoverCalendars,fetchICloudEvents} from './icloud.mjs';

// Only intervals are persisted here. Public availability never exposes Apple titles.
export async function syncCalendarBusy(db,key,range,{now=Date.now(),force=false,read}={}){
 const owners=await db.prepare("SELECT c.* FROM calendar_connections c JOIN accounts a ON a.id=c.account_id WHERE a.role='tutor' AND a.status='active' AND a.must_change_password=0 AND c.encrypted_credentials IS NOT NULL AND c.selected_calendars!='[]'").all();
 for(const owner of owners.results){
  const cached=await db.prepare('SELECT * FROM calendar_busy_cache WHERE account_id=? AND settings_version=?').bind(owner.account_id,owner.version).first();
  if(!force&&cached&&cached.starts_at<=range.start&&cached.ends_at>=range.end&&cached.checked_at>now-120000)continue;
  const credentials=openCalendarValue(owner.encrypted_credentials,key,owner.account_id,'icloud');
  const events=read?await read(owner,range):await (async()=>{const client=await iCloudClient(credentials);return fetchICloudEvents(client,await discoverCalendars(client),calendarSelection(owner),range);})();
  const intervals=events.filter(e=>e.busy!==false).map(e=>({start:e.starts_at,end:e.ends_at}));
  const saved=await db.prepare(`INSERT INTO calendar_busy_cache(account_id,settings_version,starts_at,ends_at,checked_at,intervals)
   SELECT account_id,version,?,?,?,? FROM calendar_connections WHERE account_id=? AND version=? AND encrypted_credentials IS NOT NULL
   ON CONFLICT(account_id) DO UPDATE SET settings_version=excluded.settings_version,starts_at=excluded.starts_at,ends_at=excluded.ends_at,checked_at=excluded.checked_at,intervals=excluded.intervals`)
   .bind(range.start,range.end,now,JSON.stringify(intervals),owner.account_id,owner.version).run();
  if(!saved.meta.changes)throw new CalendarError('Il collegamento iCloud è cambiato. Aggiorna gli orari.',409);
 }
}
