export type LessonPackage={id:string;amount:number;units:number;unit_amount:number;status:string;payment_method:string;live_mode?:number;paid_at:string|null;created_at:string;remaining:number};
import type {CancellationFields} from '@/lib/booking/cancellation-outcome';
export type PackageUse=CancellationFields&{id:string;package_id:string;status:string;subject:string;starts_at:string;lesson_status:string;amount:number;payment_status:string};
export type PackageData={packages:LessonPackage[];uses:PackageUse[];truncated:boolean};
