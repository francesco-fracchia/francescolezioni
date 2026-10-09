export type LessonPackage={id:string;amount:number;units:number;unit_amount:number;status:string;payment_method:string;live_mode?:number;paid_at:string|null;created_at:string;remaining:number};
export type PackageUse={id:string;package_id:string;status:string;subject:string;starts_at:string;lesson_status:string};
export type PackageData={packages:LessonPackage[];uses:PackageUse[];truncated:boolean};
