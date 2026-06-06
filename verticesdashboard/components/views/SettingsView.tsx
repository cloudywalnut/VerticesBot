'use client';
import { useState, useEffect, KeyboardEvent, CSSProperties } from 'react';
import {
  ArrowPathIcon, CheckIcon, EyeIcon, EyeSlashIcon,
  ChevronDownIcon, ChevronRightIcon, XMarkIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type SelectOpt = { value: string; label: string };
type Validator = (v: string) => string | null;

type FieldDef = {
  key:        string;
  label:      string;
  type?:      'text' | 'password' | 'select' | 'int' | 'float' | 'phone' | 'asst-boss';
  options?:   SelectOpt[];
  hint?:      string;
  validate?:  Validator;
  min?:       number;
  max?:       number;
  fullWidth?: boolean;
};

// ─── Validators ───────────────────────────────────────────────────────────────
const phoneValidator: Validator = v =>
  !v.trim()                   ? 'Required — digits only, 10–15 chars, no + or spaces'
  : !/^\d{10,15}$/.test(v.trim()) ? 'Digits only, 10–15 digits — no + or spaces'
  : null;

const intRangeValidator = (min: number, max: number): Validator => v => {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return `Whole number ${min}–${max}`;
  return null;
};

const evenIntValidator = (minVal: number): Validator => v => {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < minVal) return `Whole number ≥ ${minVal}`;
  if (n % 2 !== 0) return 'Must be an even number';
  return null;
};

const floatRangeValidator = (min: number, max: number): Validator => v => {
  if (!v.trim()) return null;
  const n = Number(v);
  if (isNaN(n) || n < min || n > max) return `Number between ${min} and ${max}`;
  return null;
};

const posIntMinValidator = (minVal: number): Validator => v => {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < minVal) return `Whole number ≥ ${minVal}`;
  return null;
};

const localeValidator: Validator = v => {
  if (!v.trim()) return null;
  if (!/^[a-z]{2,3}-[A-Z]{2,3}$/.test(v.trim())) return 'Format: en-US, ms-MY, zh-CN';
  return null;
};

const langCodeValidator: Validator = v => {
  if (!v.trim()) return null;
  if (!/^[a-z]{2,3}$/.test(v.trim())) return 'Language code: en, ms, zh, ar …';
  return null;
};

const httpUrlValidator: Validator = v => {
  if (!v.trim()) return null;
  if (!/^https?:\/\/.+/.test(v.trim())) return 'Must start with http:// or https://';
  return null;
};

const requiredValidator = (label: string): Validator => v =>
  v.trim() ? null : `${label} is required`;

// ─── Config ───────────────────────────────────────────────────────────────────
const YES_NO: SelectOpt[] = [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];
const ON_OFF: SelectOpt[] = [{ value: 'On',  label: 'On'  }, { value: 'Off', label: 'Off' }];

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Bot Identity',
    fields: [
      { key: 'BOT_NAME', label: 'Bot Name',       validate: requiredValidator('Bot Name'),        hint: 'Name your bot uses with customers' },
      { key: 'PERSON',   label: 'Customer Label', validate: requiredValidator('Customer Label'),  hint: 'How you refer to customers (e.g. Student, Client)' },
      { key: 'JOB',      label: 'Bot Role',                                                       hint: 'e.g. trading, sales, hiring' },
    ],
  },
  {
    title: 'Chat Permissions',
    fields: [
      { key: 'INDIVIDUAL_CHATS', label: 'Allow Individual Chats', type: 'select', options: YES_NO },
      { key: 'GROUP_ALLOWED',    label: 'Allow Group Chats',      type: 'select', options: YES_NO },
      { key: 'GROUP_NAMES',      label: 'Group Names', fullWidth: true, hint: 'Comma-separated group names (case-sensitive). Only used when Group Chats is On.' },
    ],
  },
  {
    title: 'Phone Numbers',
    fields: [
      { key: 'BOT_PHONE',       label: 'Bot Phone Number',      type: 'phone', validate: phoneValidator,  hint: 'Digits only, no + (e.g. 60123456789)' },
      { key: 'BOSS_PHONE',      label: 'Boss Phone Number',     type: 'phone', validate: phoneValidator,  hint: 'Digits only, no +' },
      { key: 'ASST_BOSS_PHONE', label: 'Assistant Boss Phones', type: 'asst-boss', fullWidth: true,       hint: 'Digits only, no +. Press Enter or Add to include a number.' },
    ],
  },
  {
    title: 'AI Engine',
    fields: [
      { key: 'deepseekApi',        label: 'DeepSeek API Key',   type: 'password' },
      { key: 'openaiApi',          label: 'OpenAI API Key',     type: 'password' },
      { key: 'qwenApi',            label: 'Qwen API Key',       type: 'password' },
      { key: 'antApi',             label: 'Anthropic API Key',  type: 'password' },
      { key: 'localApi',           label: 'Local API Endpoint', validate: httpUrlValidator, hint: 'e.g. http://localhost:11434/v1/chat/completions' },
      {
        key: 'AUTO_ENGINE_CHOICE', label: 'Default AI Engine', type: 'select',
        hint: 'Engine auto-selected at startup when no manual choice is made',
        options: [
          { value: '1', label: '1 — DeepSeek' },
          { value: '2', label: '2 — OpenAI' },
          { value: '3', label: '3 — Qwen' },
          { value: '4', label: '4 — Anthropic' },
          { value: '5', label: '5 — Local' },
        ],
      },
    ],
  },
  {
    title: 'Voice Settings',
    fields: [
      { key: 'USEVOICE',            label: 'Enable Voice Replies',       type: 'select', options: YES_NO },
      { key: 'VOICELANGUAGE',       label: 'Voice Language',             validate: langCodeValidator,           hint: 'ISO 639 code: en, ms, zh, ar …' },
      { key: 'VOICE_API_KEY',       label: 'ElevenLabs API Key',         type: 'password' },
      { key: 'VOICE_MODEL_ID',      label: 'Voice Model ID',             hint: 'e.g. eleven_turbo_v2_5, eleven_multilingual_v2' },
      { key: 'VOICE_ID',            label: 'Voice Profile ID',           hint: 'Leave blank for default (Rachel)' },
      { key: 'VOICE_SPEED',         label: 'Speed',         type: 'float', validate: floatRangeValidator(0.5, 1.2), hint: '0.5 – 1.2  (1.0 = normal)' },
      { key: 'VOICE_STABILITY',     label: 'Stability',     type: 'float', validate: floatRangeValidator(0, 1),     hint: '0.0 – 1.0' },
      { key: 'VOICE_SIMILARITY',    label: 'Similarity Boost', type: 'float', validate: floatRangeValidator(0, 1), hint: '0.0 – 1.0' },
      { key: 'VOICE_SPEAKER_BOOST', label: 'Speaker Boost', type: 'select', options: [{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }] },
    ],
  },
  {
    title: 'Schedule & Sleep',
    fields: [
      { key: 'VerticesSleepMode', label: 'Sleep Mode',      type: 'select', options: ON_OFF },
      { key: 'WAKE_UP_HOUR',     label: 'Wake-up Hour',     type: 'int', min: 0,  max: 23,  validate: intRangeValidator(0, 23),  hint: '0–23' },
      { key: 'WAKE_UP_MINS',     label: 'Wake-up Minute',   type: 'int', min: 0,  max: 59,  validate: intRangeValidator(0, 59),  hint: '0–59' },
      { key: 'SLEEP_HOUR',       label: 'Sleep Hour',       type: 'int', min: 0,  max: 23,  validate: intRangeValidator(0, 23),  hint: '0–23' },
      { key: 'SLEEP_MINS',       label: 'Sleep Minute',     type: 'int', min: 0,  max: 59,  validate: intRangeValidator(0, 59),  hint: '0–59' },
    ],
  },
  {
    title: 'Advanced',
    fields: [
      { key: 'HISTORY_SHORT',  label: 'Short History Size', type: 'int', min: 2,    validate: evenIntValidator(2),         hint: 'Even number (e.g. 4, 6)' },
      { key: 'HISTORY_LONG',   label: 'Long History Size',  type: 'int', min: 2,    validate: evenIntValidator(2),         hint: 'Even number, greater than Short' },
      { key: 'localFormat',    label: 'Language Format',                            validate: localeValidator,             hint: 'e.g. en-US, ms-MY' },
      { key: 'TimeZone',       label: 'Timezone',                                                                          hint: 'e.g. Asia/Kuala_Lumpur, UTC' },
      { key: 'LLM_TIMEOUT_MS', label: 'AI Timeout (ms)',    type: 'int', min: 1000, validate: posIntMinValidator(1000),    hint: 'Default 120000 (2 min)' },
      { key: 'RAG',            label: 'RAG (Vector DB)',    type: 'select', options: ON_OFF },
      { key: 'MARKETSCANNER',  label: 'Market Scanner',     type: 'select', options: ON_OFF },
    ],
  },
];

const ALL_FIELDS = GROUPS.flatMap(g => g.fields);

// ─── Component ────────────────────────────────────────────────────────────────
export function SettingsView({ addToast }: { addToast: AddToast }) {
  const [settings, setSettings]         = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [showPw, setShowPw]             = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups]     = useState<Record<string, boolean>>({ 'Bot Identity': true, 'Phone Numbers': true });
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [asstPhones, setAsstPhones]     = useState<string[]>([]);
  const [asstInput, setAsstInput]       = useState('');
  const [asstInputErr, setAsstInputErr] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      const loaded: Record<string, string> = d.settings || {};
      setSettings(loaded);
      // Parse comma-separated ASST_BOSS_PHONE into array
      const raw = loaded['ASST_BOSS_PHONE'] || '';
      setAsstPhones(raw.split(',').map(s => s.trim()).filter(s => /^\d{10,15}$/.test(s)));
      setLoading(false);
    });
  }, []);

  // ── Field change & live validation ──────────────────────────────────────────
  const setField = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    const field = ALL_FIELDS.find(f => f.key === key);
    const err   = field?.validate?.(value) ?? null;
    setErrors(prev => {
      const next = { ...prev };
      if (err) next[key] = err;
      else     delete next[key];
      return next;
    });
  };

  // ── Assistant Boss chip management ──────────────────────────────────────────
  const addAsstPhone = () => {
    const val = asstInput.trim();
    if (!/^\d{10,15}$/.test(val)) {
      setAsstInputErr('Digits only, 10–15 digits — no + or spaces');
      return;
    }
    if (asstPhones.includes(val)) {
      setAsstInputErr('This number is already added');
      return;
    }
    setAsstPhones(prev => [...prev, val]);
    setAsstInput('');
    setAsstInputErr('');
  };

  const removeAsstPhone = (p: string) => setAsstPhones(prev => prev.filter(x => x !== p));

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async () => {
    // Validate all fields
    const allErrors: Record<string, string> = {};
    for (const field of ALL_FIELDS) {
      if (field.key === 'ASST_BOSS_PHONE') continue;
      if (field.validate) {
        const err = field.validate(settings[field.key] ?? '');
        if (err) allErrors[field.key] = err;
      }
    }
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      // Auto-open groups that contain errors
      const errGroups = new Set(
        GROUPS.filter(g => g.fields.some(f => allErrors[f.key])).map(g => g.title)
      );
      setOpenGroups(prev => {
        const next = { ...prev };
        errGroups.forEach(t => { next[t] = true; });
        return next;
      });
      addToast('Fix the highlighted errors before saving', 'error');
      return;
    }

    setSaving(true);
    const updates = { ...settings, ASST_BOSS_PHONE: asstPhones.join(',') };
    const r = await fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ updates }),
    });
    const d = await r.json();
    if (d.ok) addToast('Settings saved — restart bot to apply', 'success');
    else      addToast(d.error || 'Save failed', 'error');
    setSaving(false);
  };

  const toggleGroup = (title: string) =>
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));

  const hasErrors = Object.keys(errors).length > 0;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading settings…</div>;
  }

  return (
    <div className="fade-in">
      <PageHeader title="Settings" subtitle="Configure your bot's behaviour — save then restart to apply">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving
            ? <ArrowPathIcon style={{ width: 15, height: 15 }} />
            : <CheckIcon     style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </PageHeader>

      {hasErrors && (
        <div style={{
          marginBottom: 16, padding: '10px 14px',
          background: 'var(--danger-muted)', border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius)', fontSize: 13.5, color: 'var(--danger-text)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontWeight: 600 }}>⚠</span>
          Some fields have errors — fix them before saving.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {GROUPS.map(group => {
          const groupHasError = group.fields.some(f => errors[f.key]);
          return (
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{group.title}</span>
                  {groupHasError && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--danger-text)',
                      background: 'var(--danger-muted)', border: '1px solid var(--danger-border)',
                      borderRadius: 99, padding: '1px 7px',
                    }}>
                      error
                    </span>
                  )}
                </span>
                {openGroups[group.title]
                  ? <ChevronDownIcon  style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                  : <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />}
              </button>

              {openGroups[group.title] && (
                <div style={{
                  padding: 20,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px 20px',
                }}>
                  {group.fields.map(field => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      value={settings[field.key] ?? ''}
                      error={errors[field.key]}
                      showPw={!!showPw[field.key]}
                      onTogglePw={() => setShowPw(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                      onChange={v => setField(field.key, v)}
                      // ASST_BOSS_PHONE props
                      asstPhones={asstPhones}
                      asstInput={asstInput}
                      asstInputErr={asstInputErr}
                      onAsstInputChange={v => { setAsstInput(v); setAsstInputErr(''); }}
                      onAsstAdd={addAsstPhone}
                      onAsstRemove={removeAsstPhone}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving
            ? <ArrowPathIcon style={{ width: 15, height: 15 }} />
            : <CheckIcon     style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Field Input Subcomponent ─────────────────────────────────────────────────
type FieldInputProps = {
  field:            FieldDef;
  value:            string;
  error?:           string;
  showPw:           boolean;
  onTogglePw:       () => void;
  onChange:         (v: string) => void;
  asstPhones:       string[];
  asstInput:        string;
  asstInputErr:     string;
  onAsstInputChange:(v: string) => void;
  onAsstAdd:        () => void;
  onAsstRemove:     (p: string) => void;
};

function FieldInput({
  field, value, error, showPw, onTogglePw, onChange,
  asstPhones, asstInput, asstInputErr, onAsstInputChange, onAsstAdd, onAsstRemove,
}: FieldInputProps) {
  const inputErrStyle: CSSProperties = error
    ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' }
    : {};

  const containerStyle: CSSProperties = field.fullWidth
    ? { gridColumn: '1 / -1' }
    : {};

  // ── ASST_BOSS_PHONE chip input ─────────────────────────────────────────────
  if (field.type === 'asst-boss') {
    return (
      <div style={containerStyle}>
        <label className="label">{field.label}</label>

        {asstPhones.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {asstPhones.map(p => (
              <span key={p} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--accent-muted)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)', borderRadius: 7,
                padding: '4px 10px', fontSize: 13, fontWeight: 500,
              }}>
                {p}
                <button
                  onClick={() => onAsstRemove(p)}
                  title="Remove"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center',
                    color: 'var(--accent)', opacity: 0.7,
                  }}
                >
                  <XMarkIcon style={{ width: 13, height: 13 }} />
                </button>
              </span>
            ))}
          </div>
        )}

        {asstPhones.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>
            No assistant bosses added yet
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            value={asstInput}
            onChange={e => onAsstInputChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); onAsstAdd(); } }}
            placeholder="60123456789"
            style={asstInputErr ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)', flex: 1 } : { flex: 1 }}
          />
          <button
            className="btn-secondary"
            onClick={onAsstAdd}
            style={{ padding: '9px 14px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <PlusIcon style={{ width: 13, height: 13 }} />
            Add
          </button>
        </div>

        {asstInputErr && (
          <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{asstInputErr}</div>
        )}
        {!asstInputErr && field.hint && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{field.hint}</div>
        )}
      </div>
    );
  }

  // ── Select ─────────────────────────────────────────────────────────────────
  if (field.type === 'select') {
    return (
      <div style={containerStyle}>
        <label className="label" htmlFor={field.key}>{field.label}</label>
        <select
          className="input" id={field.key}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ appearance: 'auto', ...inputErrStyle }}
        >
          {!value && <option value="">— select —</option>}
          {field.options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{error}</div>}
        {!error && field.hint && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{field.hint}</div>
        )}
      </div>
    );
  }

  // ── Password ───────────────────────────────────────────────────────────────
  if (field.type === 'password') {
    return (
      <div style={containerStyle}>
        <label className="label" htmlFor={field.key}>{field.label}</label>
        <div style={{ position: 'relative' }}>
          <input
            className="input" id={field.key}
            type={showPw ? 'text' : 'password'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Not set"
            style={{ paddingRight: 36, ...inputErrStyle }}
          />
          <button
            onClick={onTogglePw}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 0,
            }}
          >
            {showPw
              ? <EyeSlashIcon style={{ width: 15, height: 15 }} />
              : <EyeIcon      style={{ width: 15, height: 15 }} />}
          </button>
        </div>
        {error && <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{error}</div>}
      </div>
    );
  }

  // ── Phone / Int / Float / Text ─────────────────────────────────────────────
  const isNumeric = field.type === 'int';

  return (
    <div style={containerStyle}>
      <label className="label" htmlFor={field.key}>{field.label}</label>
      <input
        className="input" id={field.key}
        type={isNumeric ? 'number' : 'text'}
        inputMode={field.type === 'phone' ? 'numeric' : undefined}
        value={value}
        min={field.min}
        max={field.max}
        step={isNumeric ? 1 : undefined}
        onChange={e => onChange(e.target.value)}
        placeholder={field.hint || ''}
        style={inputErrStyle}
      />
      {error && (
        <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚠</span> {error}
        </div>
      )}
      {!error && field.hint && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{field.hint}</div>
      )}
    </div>
  );
}
