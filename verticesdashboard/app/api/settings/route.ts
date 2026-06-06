import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { ENV_FILE } from '@/lib/paths';

function parseEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    result[key] = val;
  }
  return result;
}

function applyChanges(raw: string, updates: Record<string, string>): string {
  const lines = raw.split('\n');
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return line;
    const key = trimmed.slice(0, idx).trim();
    if (key in updates) {
      return `${key}=${updates[key]}`;
    }
    return line;
  }).join('\n');
}

export async function GET() {
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf-8');
    const settings = parseEnv(raw);
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { updates } = await req.json();
    const raw = fs.readFileSync(ENV_FILE, 'utf-8');
    const newRaw = applyChanges(raw, updates);
    fs.writeFileSync(ENV_FILE, newRaw, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
