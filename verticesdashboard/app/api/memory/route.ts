import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MEM_DIR } from '@/lib/paths';

const MEM_FILES: Record<string, string> = {
  temp: 'verticesmemory-temp.txt',
  perm: 'verticesmemory-perm.txt',
};

export async function GET() {
  try {
    const result: Record<string, string> = {};
    for (const [key, filename] of Object.entries(MEM_FILES)) {
      const filePath = path.join(MEM_DIR, filename);
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
    if (!MEM_FILES[key]) {
      return NextResponse.json({ error: 'Invalid memory key' }, { status: 400 });
    }
    const filePath = path.join(MEM_DIR, MEM_FILES[key]);
    fs.mkdirSync(MEM_DIR, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
