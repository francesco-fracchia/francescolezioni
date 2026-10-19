'use client';
import {createContext,useContext,type ReactNode} from 'react';
import {unconfiguredRuntimeStatus,type RuntimeStatus} from '@/lib/runtime-status';
const RuntimeStatusContext=createContext<RuntimeStatus>(unconfiguredRuntimeStatus);
export function RuntimeStatusProvider({value,children}:{value:RuntimeStatus;children:ReactNode}){return <RuntimeStatusContext.Provider value={value}>{children}</RuntimeStatusContext.Provider>;}
export function useRuntimeStatus(){return useContext(RuntimeStatusContext);}
