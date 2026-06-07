'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { PauseView } from '@/components/views/PauseView';

export default function PausePage() {
  const { addToast } = useDashboard();
  return <PauseView addToast={addToast} />;
}
