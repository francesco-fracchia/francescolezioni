"use client";
import {createContext,useContext} from 'react';
export const SitePreviewContext=createContext(false);
export function useSitePreview(){return useContext(SitePreviewContext);}
