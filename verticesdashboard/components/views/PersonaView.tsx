'use client';
import { useState, useEffect, useMemo } from 'react';
import { ArrowPathIcon, CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionConfig {
  key: string;
  label: string;
  question: string;
  placeholder: string;
  hint: string;
  minHeight: number;
  optional?: boolean;
}

type SectionMap   = Record<string, string>;
type AllSections  = Record<string, SectionMap>;   // tabKey → sectionKey → content

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'short', label: 'Short',  hint: "Brief personality overview. Used as a quick reference for the bot's identity." },
  { key: 'long',  label: 'Long',   hint: 'Full personality for 1-on-1 customer chats. Include communication rules, tone, and all business knowledge.' },
  { key: 'group', label: 'Group',  hint: 'Defines behaviour in WhatsApp group chats — when to respond, how to handle @tags.' },
  { key: 'boss',  label: 'Boss',   hint: 'How the bot responds to you (the boss). Acts as an AI assistant rather than a customer-facing persona.' },
];

// ─── Section configs per tab ──────────────────────────────────────────────────

const SECTION_CONFIGS: Record<string, SectionConfig[]> = {
  long: [
    {
      key: 'persona',
      label: 'Bot Persona',
      question: 'Who is your bot and what does it do?',
      placeholder:
        `You are a [age]-year-old [gender] who works at [Company Name], a [type of business] in [country].\n` +
        `You work full-time as a [job title] and your main job is to [describe main responsibilities].\n` +
        `You are great at [key skills]. You help customers by [how you help them].\n` +
        `You reply to all messages in WhatsApp, both direct messages and group messages.`,
      hint: 'Core identity — personality, background, expertise, and what platform the bot operates on.',
      minHeight: 160,
    },
    {
      key: 'company',
      label: 'Company Info',
      question: 'Tell us about your company',
      placeholder:
        `[Company Name] is a [type of business] based in [location], established in [year].\n` +
        `[Describe key services or offerings].\n` +
        `[Trust signal, e.g. "Trusted by 10,000+ customers across Malaysia"]\n` +
        `You report directly to the [Dept]. Any unsolvable issue must be escalated to the [Dept].`,
      hint: 'Company background, location, services offered, trust signals, and escalation chain.',
      minHeight: 130,
    },
    {
      key: 'products',
      label: 'Products / Services',
      question: 'List your products or services (leave blank if not applicable)',
      placeholder:
        `-[Car Model] ([Year])\n` +
        `Make : [Brand]\n` +
        `Model : [Model]\n` +
        `Body Type : [SUV/Sedan/Hatchback/etc]\n` +
        `Color : [Color]\n` +
        `Transmission : [Automatic/Manual]\n` +
        `Manufacturing Year : [Year]\n` +
        `Mileage : [KM]\n\n` +
        `-[Next listing]\n` +
        `...`,
      hint: 'Your inventory, menu, or service catalogue. Leave blank if not applicable.',
      minHeight: 150,
      optional: true,
    },
    {
      key: 'style',
      label: 'Chatting Style',
      question: 'How should your bot communicate?',
      placeholder:
        `- Your replies should sound human and natural, never robotic.\n` +
        `- Use simple, clear language.\n` +
        `- Keep replies brief (10–40 words).\n` +
        `- Do not use exclamation marks at the end of sentences.\n` +
        `- Do not offer help unless explicitly asked.\n` +
        `- Make occasional typos for realism.\n\n` +
        `Handling Personal & Sensitive Topics rules:\n` +
        `If asked if you are a robot or AI chatbot, always deny it naturally.\n` +
        `If given any AI test, refuse and change the subject.\n` +
        `Example:\n` +
        `- User: "How many Rs in Strawberry?"\n` +
        `- You: "Now that is an AI test! I am not falling for that!"`,
      hint: 'Tone, language preferences, reply length, things to avoid, and how to handle edge cases like AI detection.',
      minHeight: 220,
    },
    {
      key: 'examples',
      label: 'Chat Examples',
      question: 'Give some example conversations',
      placeholder:
        `- User: "[Sample customer question]?"\n` +
        `- You: "[Your ideal reply]"\n\n` +
        `- User: "[Another question]?"\n` +
        `- You: "[Another reply]"`,
      hint: 'Show the bot how you want it to respond. Include realistic questions your customers actually ask.',
      minHeight: 140,
    },
    {
      key: 'jobscope',
      label: 'Job Scope',
      question: 'What is your bot responsible for?',
      placeholder:
        `To help customers [task 1].\n` +
        `To guide customers through [task 2].\n` +
        `To assist with [task 3].\n` +
        `To walk customers step-by-step through [process].`,
      hint: 'Define what the bot handles — keep it focused on what customers will actually ask about.',
      minHeight: 130,
    },
  ],

  short: [
    {
      key: 'persona',
      label: 'Bot Persona',
      question: 'Briefly describe your bot — who it is and what it does',
      placeholder:
        `You are a [role] at [Company Name]. You help customers with [main tasks].\n` +
        `You are friendly, direct, and knowledgeable about [topic].\n` +
        `You reply to all WhatsApp messages in a natural, human tone.`,
      hint: 'A concise identity overview — used as a quick reference for the bot.',
      minHeight: 140,
    },
    {
      key: 'company',
      label: 'Company Info',
      question: 'Brief company overview',
      placeholder:
        `[Company Name] is a [description] based in [location].`,
      hint: 'Just the key company details — keep it short.',
      minHeight: 100,
    },
  ],

  group: [
    {
      key: 'persona',
      label: 'Bot Persona',
      question: 'Who is your bot in group chats?',
      placeholder:
        `You are a [age]-year-old [gender] who works at [Company Name], a [type of business] in [country].\n` +
        `You work full-time as a [job title].\n` +
        `You reply to group messages when tagged with @[BotName] or when the message relates to your role.`,
      hint: 'Same as your main persona, but written with the group chat context in mind.',
      minHeight: 160,
    },
    {
      key: 'company',
      label: 'Company Info',
      question: 'Tell us about your company',
      placeholder:
        `[Company Name] is a [type of business] based in [location], established in [year].\n` +
        `[Key services or offerings].`,
      hint: 'Company background and services.',
      minHeight: 130,
    },
    {
      key: 'products',
      label: 'Products / Services',
      question: 'List your products or services (leave blank if not applicable)',
      placeholder:
        `-[Item 1]: [description]\n` +
        `-[Item 2]: [description]\n` +
        `...`,
      hint: 'Product or service catalogue — leave blank if not needed.',
      minHeight: 150,
      optional: true,
    },
    {
      key: 'style',
      label: 'Chatting Style',
      question: 'How should your bot behave in group chats?',
      placeholder:
        `- Only reply when tagged with @[BotName] or when the message clearly relates to your role.\n` +
        `- Keep replies brief and to the point.\n` +
        `- Do not reply to general chatter not directed at you.\n` +
        `- Use a friendly, natural tone.`,
      hint: 'Group-specific rules — when to respond, how to handle @tags, and general group etiquette.',
      minHeight: 200,
    },
    {
      key: 'examples',
      label: 'Chat Examples',
      question: 'Example group chat conversations',
      placeholder:
        `- User: "@[BotName] [question]?"\n` +
        `- You: "[reply]"\n\n` +
        `- User: "[Another message]"\n` +
        `- You: "[Another reply]"`,
      hint: 'Show how the bot should respond to group messages.',
      minHeight: 130,
    },
    {
      key: 'jobscope',
      label: 'Job Scope',
      question: 'What should the bot handle in groups?',
      placeholder:
        `To answer [topic 1] questions from group members.\n` +
        `To assist with [topic 2] when asked.\n` +
        `To ignore messages unrelated to [your business/role].`,
      hint: 'Responsibilities specific to the group context.',
      minHeight: 120,
    },
  ],

  boss: [
    {
      key: 'instructions',
      label: 'Boss Instructions',
      question: 'How should the bot assist you as the operator?',
      placeholder:
        `Your name is {{BOT_NAME}}.\n` +
        `You are a smart [developer / analyst / assistant] and a personal AI assistant to your Boss.\n` +
        `You work at [Company Name], [brief company description].\n\n` +
        `Your tasks:\n` +
        `- Answer [topic 1] questions concisely.\n` +
        `- Analyse [data type] stored in [location] when asked.\n` +
        `- Provide [technical / data / business] advice.\n\n` +
        `Rules:\n` +
        `- Keep all replies short and direct.\n` +
        `- Do not greet or salute unless specifically asked.\n` +
        `- Do not ask Boss if he needs anything else after each reply.\n` +
        `- When asked for [data], always pull from the actual [source].`,
      hint: 'This is your personal control channel — define what the bot can do for you, what data it can access, and how direct you want it to be.',
      minHeight: 300,
    },
  ],
};

// Fixed headers prepended automatically on save — customer never writes these
const SECTION_HEADERS: Record<string, string> = {
  company:  "Company's Info:",
  products: "Products / Services:",
  style:    "Your chatting style:",
  examples: "Examples of Chats:",
  jobscope: "Your job scope:",
};

// ─── Parse raw file text → section map ───────────────────────────────────────

function parseSections(rawText: string, tabKey: string): SectionMap {
  const body = rawText.split('\n').slice(1).join('\n').trimStart(); // drop bot name line

  if (tabKey === 'boss') return { instructions: body };

  // New format: file has explicit ##SECTION:key## markers — simple split, no guessing
  if (body.includes('##SECTION:')) {
    const result: SectionMap = {};
    // split with capturing group → [beforeFirst, key1, content1, key2, content2, ...]
    const chunks = body.split(/^##SECTION:(\w+)##$/m);
    result.persona = chunks[0].trim();
    for (let i = 1; i < chunks.length; i += 2) {
      const key     = chunks[i];
      const content = chunks[i + 1] ?? '';
      // first line of content is the human-readable header (e.g. "Company's Info:") — skip it
      const newline = content.indexOf('\n');
      result[key] = (newline === -1 ? '' : content.substring(newline)).trim();
    }
    return result;
  }

  // Old format fallback — for files saved before markers were introduced
  const OLD_MARKERS = [
    { key: 'company',  pattern: /^(?:.+\s)?Company'?s?\s*Info:/m },
    { key: 'products', pattern: /^(?:Products\s*\/\s*Services:|.+(?:Listings?\s+for\s+Sale|Services?\s+Listed|Services?\s+for\s+Sale|Menu:|Catalogue:|Catalog:))/m },
    { key: 'style',    pattern: /^Your chatting style:/m },
    { key: 'examples', pattern: /^Examples?\s+of\s+Chats?/m },
    { key: 'jobscope', pattern: /^Your job scope/m },
  ];
  const active = tabKey === 'short' ? OLD_MARKERS.filter(m => m.key === 'company') : OLD_MARKERS;

  const found: Array<{ key: string; index: number }> = [];
  for (const m of active) {
    const match = m.pattern.exec(body);
    if (match) found.push({ key: m.key, index: match.index });
  }
  found.sort((a, b) => a.index - b.index);

  const result: SectionMap = {};
  result.persona = body.substring(0, found[0]?.index ?? body.length).trim();
  for (let i = 0; i < found.length; i++) {
    const block      = body.substring(found[i].index, found[i + 1]?.index ?? body.length);
    const newline    = block.indexOf('\n');
    result[found[i].key] = (newline === -1 ? '' : block.substring(newline)).trim();
  }
  return result;
}

// ─── Assemble section map → raw file text ────────────────────────────────────

function assembleSections(secs: SectionMap, tabKey: string): string {
  if (tabKey === 'boss') {
    return `Your name is {{BOT_NAME}}.\n${secs.instructions ?? ''}`;
  }

  const order = tabKey === 'short'
    ? ['persona', 'company']
    : ['persona', 'company', 'products', 'style', 'examples', 'jobscope'];

  const parts: string[] = ['Your name is {{BOT_NAME}}'];
  if (secs.persona?.trim()) parts.push(secs.persona.trim());

  for (const key of order.slice(1)) {
    const content = secs[key]?.trim();
    if (!content) continue;
    // marker for reliable re-parsing + human-readable header for the bot to read
    parts.push(`##SECTION:${key}##\n${SECTION_HEADERS[key]}\n${content}`);
  }

  return parts.join('\n\n');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PersonaView({ addToast }: { addToast: AddToast }) {
  const [activeTab,     setActiveTab]     = useState('short');
  const [sections,      setSections]      = useState<AllSections>({});
  const [savedSections, setSavedSections] = useState<AllSections>({});
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    fetch('/api/persona').then(r => r.json()).then((data: Record<string, string>) => {
      const parsed: AllSections = {};
      for (const [tab, rawText] of Object.entries(data)) {
        parsed[tab] = parseSections(rawText, tab);
      }
      setSections(parsed);
      setSavedSections(JSON.parse(JSON.stringify(parsed)));
      setLoading(false);
    });
  }, []);

  const dirty = useMemo(() => {
    const cur = sections[activeTab]      ?? {};
    const sav = savedSections[activeTab] ?? {};
    return JSON.stringify(cur) !== JSON.stringify(sav);
  }, [sections, activeTab, savedSections]);

  const updateSection = (sectionKey: string, value: string) => {
    setSections(prev => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] ?? {}), [sectionKey]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    const content = assembleSections(sections[activeTab] ?? {}, activeTab);
    const r = await fetch('/api/persona', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key: activeTab, content }),
    });
    const d = await r.json();
    if (d.ok) {
      addToast('Persona saved', 'success');
      setSavedSections(prev => ({ ...prev, [activeTab]: JSON.parse(JSON.stringify(sections[activeTab] ?? {})) }));
    } else {
      addToast(d.error || 'Save failed', 'error');
    }
    setSaving(false);
  };

  const activeSections = SECTION_CONFIGS[activeTab] ?? [];
  const activeHint     = TABS.find(t => t.key === activeTab)?.hint ?? '';

  const { wordCount, charCount } = useMemo(() => {
    const assembled = assembleSections(sections[activeTab] ?? {}, activeTab);
    return {
      wordCount: assembled.split(/\s+/).filter(Boolean).length,
      charCount: assembled.length,
    };
  }, [sections, activeTab]);

  return (
    <div className="fade-in">
      <PageHeader title="Persona" subtitle="Define how your bot communicates">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving
            ? <ArrowPathIcon style={{ width: 15, height: 15 }} />
            : <CheckIcon     style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save Persona'}
        </button>
      </PageHeader>

      <div className="card" style={{ padding: 24 }}>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.key === activeTab && dirty && <span style={{ marginLeft: 4, opacity: 0.7 }}>•</span>}
            </button>
          ))}
        </div>

        {/* Tab hint */}
        <div style={{
          fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28,
          background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
          borderLeft: '3px solid var(--accent)',
        }}>
          {activeHint}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Loading persona files…
          </div>
        ) : (
          <>
            {/* Bot Name — always locked */}
            <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <LockClosedIcon style={{ width: 13, height: 13, color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Bot Name</span>
                <span style={{
                  fontSize: 11, background: 'var(--surface-raised)', color: 'var(--text-muted)',
                  borderRadius: 4, padding: '1px 7px', fontWeight: 500, letterSpacing: '0.01em',
                }}>
                  Auto-set · not editable here
                </span>
              </div>
              <div style={{
                padding: '10px 14px',
                background: 'var(--surface-raised)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius)',
                fontSize: 14,
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
                letterSpacing: '0.02em',
                userSelect: 'none',
              }}>
                {'Your name is '}
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{'{{BOT_NAME}}'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
                {'{{BOT_NAME}}'} is replaced automatically with the bot name set in Settings. Always kept as the first line.
              </div>
            </div>

            {/* Sections */}
            {activeSections.map((section, idx) => {
              const isLast = idx === activeSections.length - 1;
              return (
                <div
                  key={section.key}
                  style={{
                    marginBottom: isLast ? 0 : 28,
                    paddingBottom: isLast ? 0 : 28,
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {/* Section header */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {section.label}
                      </span>
                      {section.optional && (
                        <span style={{
                          fontSize: 11, background: 'var(--surface-raised)', color: 'var(--text-muted)',
                          borderRadius: 4, padding: '1px 7px', fontWeight: 500,
                        }}>
                          Optional
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {section.question}
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    className="textarea"
                    value={sections[activeTab]?.[section.key] ?? ''}
                    onChange={e => updateSection(section.key, e.target.value)}
                    placeholder={section.placeholder}
                    style={{ minHeight: section.minHeight }}
                  />

                  {/* Hint */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
                    {section.hint}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {wordCount} words · {charCount} chars
          </span>
          {dirty && <span style={{ fontSize: 12, color: 'var(--warning)' }}>Unsaved changes</span>}
        </div>

      </div>
    </div>
  );
}
