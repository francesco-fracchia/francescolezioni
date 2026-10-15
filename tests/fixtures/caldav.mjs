export function syntheticAppleTransport(data,requests=[]){
 const multi=content=>new Response(`<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/">${content}</d:multistatus>`,{status:207,headers:{'Content-Type':'application/xml'}});
 const prop=(href,content)=>`<d:response><d:href>${href}</d:href><d:propstat><d:prop>${content}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`;
 return async(url,options={})=>{
  requests.push({url:String(url),method:options.method,body:options.body});const body=String(options.body||'');
  if(String(url).includes('/.well-known/'))return new Response(null,{status:301,headers:{Location:'https://p01-caldav.icloud.com/'}});
  if(body.includes('current-user-principal'))return multi(prop('/', '<d:current-user-principal><d:href>/owner/principal/</d:href></d:current-user-principal>'));
  if(body.includes('calendar-home-set'))return multi(prop('/owner/principal/','<c:calendar-home-set><d:href>/owner/calendars/</d:href></c:calendar-home-set>'));
  if(body.includes('calendar-query'))return multi(prop('/owner/calendars/personal/event.ics',`<d:getetag>"1"</d:getetag><c:calendar-data><![CDATA[${typeof data==='function'?await data():data}]]></c:calendar-data>`));
  if(body.includes('supported-report-set'))return multi(prop('/owner/calendars/personal/','<d:supported-report-set><d:supported-report><d:report><c:calendar-query/></d:report></d:supported-report></d:supported-report-set>'));
  return multi(prop('/owner/calendars/personal/','<d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>Personale</d:displayname><a:calendar-color>#087f8cff</a:calendar-color><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>'));
 };
}
