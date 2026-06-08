'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { MemoryView } from '@/components/views/MemoryView';

export default function MemoryPage() {
  const { addToast } = useDashboard();
  return <MemoryView addToast={addToast} />;
}
