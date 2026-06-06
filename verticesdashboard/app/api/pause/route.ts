import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { PAUSE_FILE } from '@/lib/paths';

const DEFAULT = { paused: [] as string[], global: false };

function read() {
  if (!fs.existsSync(PAUSE_FILE)) return DEFAULT;
  try { return JSON.parse(fs.readFileSync(PAUSE_FILE, 'utf-8')); } catch { return DEFAULT; }
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    fs.writeFileSync(PAUSE_FILE, JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
