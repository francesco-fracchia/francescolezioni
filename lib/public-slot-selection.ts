// Reject duplicate/arbitrary query parameters; a shared link never reserves a slot.
export function publicSlotSelection(value:string|string[]|undefined){return typeof value==='string'&&value.length===36&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value:'';}
