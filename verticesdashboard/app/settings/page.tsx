'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { SettingsView } from '@/components/views/SettingsView';

export default function SettingsPage() {
  const { addToast } = useDashboard();
  return <SettingsView addToast={addToast} />;
}
