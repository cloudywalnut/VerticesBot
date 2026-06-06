import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PERSONA_DIR } from '@/lib/paths';

const PERSONA_FILES: Record<string, string> = {
  short: 'verticespersona-short.txt',
  long: 'verticespersona-long.txt',
  group: 'verticespersona-group.txt',
  boss: 'verticespersona-boss.txt',
};

export async function GET() {
  try {
    const result: Record<string, string> = {};
    for (const [key, filename] of Object.entries(PERSONA_FILES)) {
      const filePath = path.join(PERSONA_DIR, filename);
      result[key] = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, content } = await req.json();
    if (!PERSONA_FILES[key]) {
      return NextResponse.json({ error: 'Invalid persona key' }, { status: 400 });
    }
    const filePath = path.join(PERSONA_DIR, PERSONA_FILES[key]);
    fs.mkdirSync(PERSONA_DIR, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
