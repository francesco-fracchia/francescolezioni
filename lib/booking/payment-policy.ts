export const paymentDeadline = (startsAt:string) => new Date(Date.parse(startsAt)-3600000).toISOString();
export const deadlinePassed = (startsAt:string,now=Date.now()) => now>=Date.parse(paymentDeadline(startsAt));
