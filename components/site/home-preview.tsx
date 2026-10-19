"use client";
import {useId,useState,type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

/** Desktop previews stay visible; on small screens the visitor chooses to open them. */
export default function HomePreview({label,children}:{label:string;children:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const id=useId();
 return <div className="home-preview" data-expanded={expanded}>
  <button type="button" className="home-preview-toggle" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(value=>!value)}>{label}<ChevronDown size={18} aria-hidden="true"/></button>
  <div id={id} className="home-preview-content">{children}</div>
 </div>;
}
