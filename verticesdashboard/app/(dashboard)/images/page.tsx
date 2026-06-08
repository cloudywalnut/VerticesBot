'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { ImagesView } from '@/components/views/ImagesView';

export default function ImagesPage() {
  const { addToast, isMobile } = useDashboard();
  return <ImagesView addToast={addToast} isMobile={isMobile} />;
}
