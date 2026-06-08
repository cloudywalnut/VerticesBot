import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { ENV_FILE } from '@/lib/paths';

function getSecret(): string | undefined {
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf-8');
    for (const line of raw.split('\n')) {
      if (line.startsWith('AUTH_SECRET=')) {
        const val = line.slice('AUTH_SECRET='.length).trim();
        if (val) return val;
      }
    }
  } catch {}
  return undefined;
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = getSecret();

  if (!secret || !token || !(await verifyToken(token, secret))) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api/auth|_next|favicon.ico|.*\\.png$|.*\\.ico$).*)'],
};
