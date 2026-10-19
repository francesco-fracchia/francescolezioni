export function agendaCursor(key:string,row:number,column:number,rows:number,columns:number,control=false){
 let r=row,c=column;
 switch(key){
  case 'ArrowUp':r--;break;case 'ArrowDown':r++;break;
  case 'ArrowLeft':c--;break;case 'ArrowRight':c++;break;
  case 'PageUp':r-=4;break;case 'PageDown':r+=4;break;
  case 'Home':r=0;if(control)c=0;break;
  case 'End':r=rows-1;if(control)c=columns-1;break;
  default:return null;
 }
 return {row:Math.max(0,Math.min(rows-1,r)),column:Math.max(0,Math.min(columns-1,c))};
}
export function dateCursor(key:string,index:number,count:number){
 const step:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
 if(key==='Home')return index-index%7;
 if(key==='End')return Math.min(count-1,index-index%7+6);
 return key in step?Math.max(0,Math.min(count-1,index+step[key])):null;
}
