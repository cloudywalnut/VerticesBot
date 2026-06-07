'use client';
import { createContext, useContext } from 'react';
import type { AddToast } from '@/lib/types';

type DashboardCtx = { addToast: AddToast; isMobile: boolean };

export const DashboardContext = createContext<DashboardCtx>({
  addToast: () => {},
  isMobile: false,
});

export const useDashboard = () => useContext(DashboardContext);
