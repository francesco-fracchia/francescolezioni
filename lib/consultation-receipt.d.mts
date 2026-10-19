export type ConfirmedConsultation = {id:string;starts_at:string;ends_at:string;mode:string;status:string};
export function consultationReceipt(appointment: ConfirmedConsultation, now?: number): {summary:string;instructions:string;calendar:string};
