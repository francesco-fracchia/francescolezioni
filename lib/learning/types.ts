export type Course={id:string;title:string;subject:string;description:string;status:string};
export type Module={id:string;course_id:string;title:string;position:number};
export type Material={id:string;module_id:string;title:string;kind:string;body:string;status:string;position:number;filename:string|null;size:number|null;created_at?:string};
export type Access={id:string;student_id:string;email:string;role:string;status:string;user_id:string|null};
export type Enrollment={student_id:string;course_id:string;status:string};
export type LearningData={courses:Course[];modules:Module[];materials:Material[];access:Access[];enrollments:Enrollment[];students:{id:string;name:string;status:string}[]};
export type StudentAppointment={kind:'lesson'|'booking';id:string;subject:string;starts_at:string;ends_at:string;mode:string;status:string;video_url?:string|null};
export type StudentData={students:{id:string;name:string}[];selected:string|null;preview:boolean;courses:Course[];modules:Module[];materials:(Material&{completed_at:string|null})[];lessons:{id:string;subject:string;starts_at:string;ends_at:string;mode:string;status:string;video_url?:string|null;payment_method:string;lesson_payment_status:string;payment_id:string|null;amount:number|null;credit_amount?:number;package_status?:string|null;payment_status:string|null;paid_at:string|null}[];bookings:{id:string;subject:string;status:string;starts_at:string;ends_at:string;mode:string;video_url?:string|null}[];nextAppointment?:StudentAppointment|null;truncated?:boolean};
