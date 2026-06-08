'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { ChatsView } from '@/components/views/ChatsView';

export default function ChatsPage() {
  const { addToast, isMobile } = useDashboard();
  return <ChatsView addToast={addToast} isMobile={isMobile} />;
}
