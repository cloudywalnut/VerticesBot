'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { TestChatView } from '@/components/views/TestChatView';

export default function TestChatPage() {
  const { addToast } = useDashboard();
  return <TestChatView addToast={addToast} />;
}
