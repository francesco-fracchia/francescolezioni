export type RewardKind='individual'|'group';
export const referralPattern=/^FF-[a-f0-9]{16}$/;
export function referralSelection(value:unknown){return typeof value==='string'&&referralPattern.test(value)?value:'';}
export const rewardAmount=(kind:RewardKind)=>kind==='group'?1000:500;
export const rewardLabels={individual:'Lezioni individuali',group:'Lezioni di gruppo insieme'};
export function creditExpiry(now:Date){const date=new Date(now);const day=date.getUTCDate();date.setUTCDate(1);date.setUTCFullYear(date.getUTCFullYear()+1);const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));return date.toISOString();}
export type Credit={id:string;kind:RewardKind;amount:number;remaining:number;expires_at:string;status:string;available:number};
export type InviteSummary={id:string;status:string;reward_kind:RewardKind|null;created_at:string};
export type ReferralData={code:string|null;credits:Credit[];invites:InviteSummary[];preview:boolean;truncated:boolean};
