'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { HomeView } from '@/components/views/HomeView';

export default function HomePage() {
  const { addToast, isMobile } = useDashboard();
  return <HomeView addToast={addToast} isMobile={isMobile} />;
}
