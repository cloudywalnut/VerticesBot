import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { ENV_FILE } from '@/lib/paths';
import { signToken, COOKIE_NAME, MAX_AGE_SECS } from '@/lib/auth';

function parseEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    result[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const env = parseEnv(fs.readFileSync(ENV_FILE, 'utf-8'));
  const expectedUser = env.WEBDASHBOARD_USERNAME || 'admin';
  const expectedPass = env.WEBDASHBOARD_PASSWORD || 'admin';
  const secret = env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured: AUTH_SECRET missing' }, { status: 500 });
  }

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: MAX_AGE_SECS,
    path: '/',
  });
  return res;
}
