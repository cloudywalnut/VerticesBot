'use client';
import { useState, useEffect } from 'react';
import { ArrowPathIcon, CheckIcon, EyeIcon, EyeSlashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'select' | 'number';
  options?: string[];
  hint?: string;
};

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Bot Identity',
    fields: [
      { key: 'BOT_NAME', label: 'Bot Name', hint: 'Name your bot uses with customers' },
      { key: 'PERSON',   label: 'Customer Label', hint: 'How you refer to customers (singular)' },
      { key: 'JOB',      label: 'Bot Role', hint: 'e.g. trading, sales, hiring' },
    ],
  },
  {
    title: 'Chat Permissions',
    fields: [
      { key: 'INDIVIDUAL_CHATS', label: 'Allow Individual Chats', type: 'select', options: ['Yes', 'No'] },
      { key: 'GROUP_ALLOWED',    label: 'Allow Group Chats',      type: 'select', options: ['Yes', 'No'] },
      { key: 'GROUP_NAMES',      label: 'Group Names', hint: 'Comma-separated, case-sensitive' },
    ],
  },
  {
    title: 'Phone Numbers',
    fields: [
      { key: 'BOT_PHONE',       label: 'Bot Phone Number',        hint: 'Number your bot uses (no + or spaces)' },
      { key: 'BOSS_PHONE',      label: 'Boss Phone Number',       hint: 'Your number — gets special access' },
      { key: 'ASST_BOSS_PHONE', label: 'Assistant Boss Phone',    hint: 'Optional secondary admin' },
    ],
  },
  {
    title: 'AI Engine',
    fields: [
      { key: 'deepseekApi',         label: 'Deepseek API Key',    type: 'password' },
      { key: 'openaiApi',           label: 'OpenAI API Key',      type: 'password' },
      { key: 'qwenApi',             label: 'Qwen API Key',        type: 'password' },
      { key: 'antApi',              label: 'Anthropic API Key',   type: 'password' },
      { key: 'localApi',            label: 'Local API Endpoint',  hint: 'e.g. http://localhost:11434' },
      { key: 'AUTO_ENGINE_CHOICE',  label: 'Auto Engine Choice',  type: 'select', options: ['1','2','3','4','5'], hint: '1=Deepseek 2=OpenAI 3=Qwen 4=Anthropic 5=Local' },
    ],
  },
  {
    title: 'Voice Settings',
    fields: [
      { key: 'USEVOICE',           label: 'Enable Voice Responses', type: 'select', options: ['Yes', 'No'] },
      { key: 'VOICELANGUAGE',      label: 'Voice Language Code',    hint: 'e.g. en, ms, zh' },
      { key: 'VOICE_API_KEY',      label: 'ElevenLabs API Key',     type: 'password' },
      { key: 'VOICE_MODEL_ID',     label: 'Voice Model ID',         hint: 'e.g. eleven_turbo_v2_5' },
      { key: 'VOICE_ID',           label: 'Voice Profile ID',       hint: 'Leave blank for default' },
      { key: 'VOICE_SPEED',        label: 'Speed',                  hint: '1.0 = normal, max 1.2' },
      { key: 'VOICE_STABILITY',    label: 'Stability (0–1)' },
      { key: 'VOICE_SIMILARITY',   label: 'Similarity Boost (0–1)' },
      { key: 'VOICE_SPEAKER_BOOST',label: 'Speaker Boost',          type: 'select', options: ['true', 'false'] },
    ],
  },
  {
    title: 'Schedule & Sleep',
    fields: [
      { key: 'VerticesSleepMode', label: 'Sleep Mode',            type: 'select', options: ['Off', 'On'] },
      { key: 'WAKE_UP_HOUR',      label: 'Wake-up Hour (0–23)',   type: 'number' },
      { key: 'WAKE_UP_MINS',      label: 'Wake-up Minute (0–59)', type: 'number' },
      { key: 'SLEEP_HOUR',        label: 'Sleep Hour (0–23)',     type: 'number' },
      { key: 'SLEEP_MINS',        label: 'Sleep Minute (0–59)',   type: 'number' },
    ],
  },
  {
    title: 'Advanced',
    fields: [
      { key: 'HISTORY_SHORT',  label: 'Short History Size', type: 'number', hint: 'Even number' },
      { key: 'HISTORY_LONG',   label: 'Long History Size',  type: 'number', hint: 'Even number' },
      { key: 'localFormat',    label: 'Language Format',    hint: 'e.g. en-US, ms-MY' },
      { key: 'TimeZone',       label: 'Timezone',           hint: 'e.g. Asia/Kuala_Lumpur' },
      { key: 'LLM_TIMEOUT_MS', label: 'AI Timeout (ms)',    type: 'number', hint: 'Default 120000' },
      { key: 'RAG',            label: 'RAG (Vector DB)',     type: 'select', options: ['Off', 'On'] },
      { key: 'MARKETSCANNER',  label: 'Market Scanner',     type: 'select', options: ['Off', 'On'] },
    ],
  },
];

export function SettingsView({ addToast }: { addToast: AddToast }) {
  const [settings, setSettings]     = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showPw, setShowPw]         = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Bot Identity': true, 'Phone Numbers': true,
  });

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d.settings || {});
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const r = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: settings }),
    });
    const d = await r.json();
    if (d.ok) addToast('Settings saved — restart bot to apply', 'success');
    else addToast(d.error || 'Save failed', 'error');
    setSaving(false);
  };

  const setField = (key: string, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const toggleGroup = (title: string) =>
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading settings…</div>;
  }

  return (
    <div className="fade-in">
      <PageHeader title="Settings" subtitle="Configure your bot's behaviour — save then restart to apply">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <ArrowPathIcon style={{ width: 15, height: 15 }} /> : <CheckIcon style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </PageHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {GROUPS.map(group => (
          <div key={group.title} className="card" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => toggleGroup(group.title)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: openGroups[group.title] ? '1px solid var(--border)' : 'none',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{group.title}</span>
              {openGroups[group.title]
                ? <ChevronDownIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                : <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />}
            </button>

            {openGroups[group.title] && (
              <div style={{
                padding: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px 20px',
              }}>
                {group.fields.map(field => (
                  <div key={field.key}>
                    <label className="label" htmlFor={field.key}>{field.label}</label>

                    {field.type === 'select' ? (
                      <select
                        className="input" id={field.key}
                        value={settings[field.key] || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        style={{ appearance: 'auto' }}
                      >
                        <option value="">— select —</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === 'password' ? (
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input" id={field.key}
                          type={showPw[field.key] ? 'text' : 'password'}
                          value={settings[field.key] || ''}
                          onChange={e => setField(field.key, e.target.value)}
                          placeholder="Not set"
                          style={{ paddingRight: 36 }}
                        />
                        <button
                          onClick={() => setShowPw(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                        >
                          {showPw[field.key]
                            ? <EyeSlashIcon style={{ width: 15, height: 15 }} />
                            : <EyeIcon style={{ width: 15, height: 15 }} />}
                        </button>
                      </div>
                    ) : (
                      <input
                        className="input" id={field.key}
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={settings[field.key] || ''}
                        onChange={e => setField(field.key, e.target.value)}
                        placeholder={field.hint || ''}
                      />
                    )}

                    {field.hint && field.type !== 'password' && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{field.hint}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? <ArrowPathIcon style={{ width: 15, height: 15 }} /> : <CheckIcon style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
