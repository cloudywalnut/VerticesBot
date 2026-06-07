'use client';
import { useDashboard } from '@/lib/DashboardContext';
import { PersonaView } from '@/components/views/PersonaView';

export default function PersonaPage() {
  const { addToast } = useDashboard();
  return <PersonaView addToast={addToast} />;
}
