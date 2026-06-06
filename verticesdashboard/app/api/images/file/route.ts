import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { IMG_DIR } from '@/lib/paths';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
};

function safe(folder: string, file: string) {
  const resolved = path.resolve(path.join(IMG_DIR, folder, file));
  const base = path.resolve(IMG_DIR);
  if (!resolved.startsWith(base)) throw new Error('Access denied');
  return resolved;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder');
  const file = searchParams.get('file');
  if (!folder || !file) return NextResponse.json({ error: 'folder and file required' }, { status: 400 });

  try {
    const fp = safe(folder, file);
    if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const bytes = fs.readFileSync(fp);
    const ct = MIME[path.extname(file).toLowerCase()] ?? 'image/jpeg';
    return new Response(bytes, { headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder');
  const file = searchParams.get('file');
  if (!folder || !file) return NextResponse.json({ error: 'folder and file required' }, { status: 400 });

  try {
    const fp = safe(folder, file);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
