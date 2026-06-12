'use client';
import { useState, useEffect, KeyboardEvent, CSSProperties } from 'react';
import {
  ArrowPathIcon, CheckIcon, EyeIcon, EyeSlashIcon,
  ChevronDownIcon, ChevronRightIcon, XMarkIcon, PlusIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';
import { TIMEZONES, LOCALE_FORMATS, WHISPER_LANGUAGES } from '@/lib/settingsOptions';

// ─── Types ────────────────────────────────────────────────────────────────────
type SelectOpt = { value: string; label: string };
type Validator = (v: string) => string | null;

type FieldDef = {
  key:        string;
  label:      string;
  type?:      'text' | 'password' | 'select' | 'int' | 'float' | 'phone' | 'asst-boss' | 'group-names';
  options?:   SelectOpt[];
  hint?:      string;
  validate?:  Validator;
  min?:       number;
  max?:       number;
  fullWidth?: boolean;
};

type Group = { title: string; wide?: boolean; fields: FieldDef[] };

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

const GROUPS: Group[] = [
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
      { key: 'GROUP_NAMES',      label: 'Group Names', type: 'group-names', fullWidth: true, hint: 'Group names are case-sensitive. Only used when Group Chats is enabled.' },
    ],
  },
  {
    title: 'Phone Numbers',
    fields: [
      { key: 'BOT_PHONE',       label: 'Bot WhatsApp ID',            type: 'phone', validate: phoneValidator,  hint: 'Digits only' },
      { key: 'BOSS_PHONE',      label: 'Boss WhatsApp ID',           type: 'phone', validate: phoneValidator,  hint: 'Digits only' },
      { key: 'ASST_BOSS_PHONE', label: 'Assistant Boss WhatsApp IDs', type: 'asst-boss', fullWidth: true,      hint: 'Digits only. Press Enter or Add.' },
    ],
  },
  {
    title: 'AI Engine',
    wide: true,
    fields: [
      { key: 'openaiApi',          label: 'OpenAI API Key',     type: 'password' },
      { key: 'deepseekApi',        label: 'DeepSeek API Key',   type: 'password' },
      { key: 'qwenApi',            label: 'Qwen API Key',       type: 'password' },
      { key: 'antApi',             label: 'Anthropic API Key',  type: 'password' },
      { key: 'localApi',           label: 'Local API Endpoint', validate: httpUrlValidator, hint: 'e.g. http://localhost:11434/v1/chat/completions' },
      {
        key: 'AUTO_ENGINE_CHOICE', label: 'Default AI Engine', type: 'select',
        hint: 'OpenAI is recommended — it is the only engine with full support for voice transcription, image vision, RAG embeddings, and PDF summarization.',
        options: [
          { value: '1', label: '1 — OpenAI (Recommended — full feature support)' },
          { value: '2', label: '2 — DeepSeek' },
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
      { key: 'VOICELANGUAGE',       label: 'Voice Language',             type: 'select', options: WHISPER_LANGUAGES },
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
      { key: 'localFormat',    label: 'Local Format',  type: 'select', options: LOCALE_FORMATS },
      { key: 'TimeZone',       label: 'Timezone',         type: 'select', options: TIMEZONES },
      { key: 'LLM_TIMEOUT_MS', label: 'AI Timeout (ms)',    type: 'int', min: 1000, validate: posIntMinValidator(1000),    hint: 'Default 120000 (2 min)' },
      { key: 'RAG',            label: 'RAG (Vector DB)',    type: 'select', options: ON_OFF },
      { key: 'MARKETSCANNER',  label: 'Market Scanner',     type: 'select', options: ON_OFF },
    ],
  },
];

const ALL_FIELDS = GROUPS.flatMap(g => g.fields);

// ─── Component ────────────────────────────────────────────────────────────────
export function SettingsView({ addToast }: { addToast: AddToast }) {
  const [settings, setSettings]           = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [showPw, setShowPw]               = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups]       = useState<Record<string, boolean>>({ 'Bot Identity': true, 'Phone Numbers': true });
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [asstPhones, setAsstPhones]       = useState<string[]>([]);
  const [asstInput, setAsstInput]         = useState('');
  const [asstInputErr, setAsstInputErr]   = useState('');
  const [groupNames, setGroupNames]       = useState<string[]>([]);
  const [groupInput, setGroupInput]       = useState('');
  const [groupInputErr, setGroupInputErr] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      const loaded: Record<string, string> = d.settings || {};
      setSettings(loaded);
      const rawAsst = loaded['ASST_BOSS_PHONE'] || '';
      setAsstPhones(rawAsst.split(',').map(s => s.trim()).filter(s => /^\d{10,15}$/.test(s)));
      const rawGroups = loaded['GROUP_NAMES'] || '';
      setGroupNames(rawGroups.split(',').map(s => s.trim()).filter(Boolean));
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

  // ── Group Names chip management ──────────────────────────────────────────────
  const addGroupName = () => {
    const val = groupInput.trim();
    if (!val) { setGroupInputErr('Group name cannot be empty'); return; }
    if (groupNames.includes(val)) { setGroupInputErr('Already in the list'); return; }
    setGroupNames(prev => [...prev, val]);
    setGroupInput('');
    setGroupInputErr('');
  };

  const removeGroupName = (g: string) => setGroupNames(prev => prev.filter(x => x !== g));

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async () => {
    const allErrors: Record<string, string> = {};
    for (const field of ALL_FIELDS) {
      if (field.key === 'ASST_BOSS_PHONE' || field.key === 'GROUP_NAMES') continue;
      if (field.validate) {
        const err = field.validate(settings[field.key] ?? '');
        if (err) allErrors[field.key] = err;
      }
    }
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
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
    const updates = {
      ...settings,
      ASST_BOSS_PHONE: asstPhones.join(','),
      GROUP_NAMES:     groupNames.join(','),
    };
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
                  gridTemplateColumns: `repeat(auto-fit, minmax(${group.wide ? '300px' : '240px'}, 1fr))`,
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
                      asstPhones={asstPhones}
                      asstInput={asstInput}
                      asstInputErr={asstInputErr}
                      onAsstInputChange={v => { setAsstInput(v); setAsstInputErr(''); }}
                      onAsstAdd={addAsstPhone}
                      onAsstRemove={removeAsstPhone}
                      groupNames={groupNames}
                      groupInput={groupInput}
                      groupInputErr={groupInputErr}
                      onGroupInputChange={v => { setGroupInput(v); setGroupInputErr(''); }}
                      onGroupAdd={addGroupName}
                      onGroupRemove={removeGroupName}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-start' }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving
            ? <ArrowPathIcon style={{ width: 15, height: 15 }} />
            : <CheckIcon     style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      <CredentialsSection addToast={addToast} />
    </div>
  );
}

// ─── Credentials Section ──────────────────────────────────────────────────────
function CredentialsSection({ addToast }: { addToast: AddToast }) {
  const [open, setOpen]           = useState(false);
  const [saving, setSaving]       = useState(false);
  const [newUser, setNewUser]     = useState('');
  const [confUser, setConfUser]   = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confPass, setConfPass]   = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    const changingUser = newUser.trim() || confUser.trim();
    const changingPass = newPass || confPass;

    if (!changingUser && !changingPass) {
      e._form = 'Enter a new username, a new password, or both.';
      return e;
    }

    if (changingUser) {
      if (!newUser.trim())   e.newUser  = 'Username cannot be empty';
      if (!confUser.trim())  e.confUser = 'Please confirm the username';
      if (newUser.trim() && confUser.trim() && newUser.trim() !== confUser.trim())
        e.confUser = 'Usernames do not match';
    }

    if (changingPass) {
      if (!newPass)          e.newPass  = 'Password cannot be empty';
      if (!confPass)         e.confPass = 'Please confirm the password';
      if (newPass && confPass && newPass !== confPass)
        e.confPass = 'Passwords do not match';
    }

    return e;
  }

  async function handleSave() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const updates: Record<string, string> = {};
    if (newUser.trim()) updates.WEBDASHBOARD_USERNAME = newUser.trim();
    if (newPass)        updates.WEBDASHBOARD_PASSWORD = newPass;

    const r = await fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ updates }),
    });
    const d = await r.json();
    if (d.ok) {
      addToast('Login credentials updated', 'success');
      setNewUser(''); setConfUser(''); setNewPass(''); setConfPass('');
    } else {
      addToast(d.error || 'Save failed', 'error');
    }
    setSaving(false);
  }

  const inputStyle = (err?: string): CSSProperties => err
    ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' }
    : {};

  return (
    <div className="card" style={{ overflow: 'hidden', marginTop: 16 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LockClosedIcon style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>Dashboard Credentials</span>
        </span>
        {open
          ? <ChevronDownIcon  style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          : <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />}
      </button>

      {open && (
        <div style={{ padding: 20 }}>
          {errors._form && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'var(--danger-muted)', border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--danger-text)',
            }}>
              {errors._form}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px 20px' }}>
            {/* Username */}
            <div>
              <label className="label">New Username</label>
              <input
                className="input"
                type="text"
                value={newUser}
                autoComplete="off"
                onChange={e => { setNewUser(e.target.value); setErrors(p => { const n = {...p}; delete n.newUser; delete n._form; return n; }); }}
                placeholder="Leave blank to keep current"
                style={inputStyle(errors.newUser)}
              />
              {errors.newUser && <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{errors.newUser}</div>}
            </div>

            <div>
              <label className="label">Confirm New Username</label>
              <input
                className="input"
                type="text"
                value={confUser}
                autoComplete="off"
                onChange={e => { setConfUser(e.target.value); setErrors(p => { const n = {...p}; delete n.confUser; delete n._form; return n; }); }}
                placeholder="Repeat the new username"
                style={inputStyle(errors.confUser)}
              />
              {errors.confUser && <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{errors.confUser}</div>}
            </div>

            {/* Password */}
            <div>
              <label className="label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  autoComplete="new-password"
                  onChange={e => { setNewPass(e.target.value); setErrors(p => { const n = {...p}; delete n.newPass; delete n._form; return n; }); }}
                  placeholder="Leave blank to keep current"
                  style={{ paddingRight: 36, ...inputStyle(errors.newPass) }}
                />
                <button onClick={() => setShowNew(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {showNew ? <EyeSlashIcon style={{ width: 15, height: 15 }} /> : <EyeIcon style={{ width: 15, height: 15 }} />}
                </button>
              </div>
              {errors.newPass && <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{errors.newPass}</div>}
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showConf ? 'text' : 'password'}
                  value={confPass}
                  autoComplete="new-password"
                  onChange={e => { setConfPass(e.target.value); setErrors(p => { const n = {...p}; delete n.confPass; delete n._form; return n; }); }}
                  placeholder="Repeat the new password"
                  style={{ paddingRight: 36, ...inputStyle(errors.confPass) }}
                />
                <button onClick={() => setShowConf(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  {showConf ? <EyeSlashIcon style={{ width: 15, height: 15 }} /> : <EyeIcon style={{ width: 15, height: 15 }} />}
                </button>
              </div>
              {errors.confPass && <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{errors.confPass}</div>}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving
                ? <ArrowPathIcon style={{ width: 15, height: 15 }} />
                : <LockClosedIcon style={{ width: 15, height: 15 }} />}
              {saving ? 'Saving…' : 'Update Credentials'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field Input Subcomponent ─────────────────────────────────────────────────
type FieldInputProps = {
  field:              FieldDef;
  value:              string;
  error?:             string;
  showPw:             boolean;
  onTogglePw:         () => void;
  onChange:           (v: string) => void;
  asstPhones:         string[];
  asstInput:          string;
  asstInputErr:       string;
  onAsstInputChange:  (v: string) => void;
  onAsstAdd:          () => void;
  onAsstRemove:       (p: string) => void;
  groupNames:         string[];
  groupInput:         string;
  groupInputErr:      string;
  onGroupInputChange: (v: string) => void;
  onGroupAdd:         () => void;
  onGroupRemove:      (g: string) => void;
};

function FieldInput({
  field, value, error, showPw, onTogglePw, onChange,
  asstPhones, asstInput, asstInputErr, onAsstInputChange, onAsstAdd, onAsstRemove,
  groupNames, groupInput, groupInputErr, onGroupInputChange, onGroupAdd, onGroupRemove,
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

  // ── GROUP_NAMES chip input ─────────────────────────────────────────────────
  if (field.type === 'group-names') {
    return (
      <div style={containerStyle}>
        <label className="label">{field.label}</label>

        {groupNames.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {groupNames.map(g => (
              <span key={g} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--accent-muted)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)', borderRadius: 7,
                padding: '4px 10px', fontSize: 13, fontWeight: 500,
              }}>
                {g}
                <button
                  onClick={() => onGroupRemove(g)}
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

        {groupNames.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>
            No groups added yet
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type="text"
            value={groupInput}
            onChange={e => onGroupInputChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); onGroupAdd(); } }}
            placeholder="Group name (case-sensitive)"
            style={groupInputErr ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)', flex: 1 } : { flex: 1 }}
          />
          <button
            className="btn-secondary"
            onClick={onGroupAdd}
            style={{ padding: '9px 14px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <PlusIcon style={{ width: 13, height: 13 }} />
            Add
          </button>
        </div>

        {groupInputErr && (
          <div style={{ fontSize: 11.5, color: 'var(--danger-text)', marginTop: 4 }}>{groupInputErr}</div>
        )}
        {!groupInputErr && field.hint && (
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
