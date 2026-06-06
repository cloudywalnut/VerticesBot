import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { IMG_DIR } from '@/lib/paths';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

function safe(sub: string) {
  const resolved = path.resolve(path.join(IMG_DIR, sub));
  const base = path.resolve(IMG_DIR);
  if (!resolved.startsWith(base)) throw new Error('Access denied');
  return resolved;
}

export async function GET(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  fs.mkdirSync(IMG_DIR, { recursive: true });

  if (!folder) {
    const items = fs.readdirSync(IMG_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const files = fs.readdirSync(path.join(IMG_DIR, d.name)).filter(f => IMAGE_EXT.test(f));
        return { name: d.name, count: files.length };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ folders: items });
  }

  try {
    const fp = safe(folder);
    if (!fs.existsSync(fp)) return NextResponse.json({ files: [] });
    const files = fs.readdirSync(fp).filter(f => IMAGE_EXT.test(f)).sort();
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    fs.mkdirSync(safe(name.trim()), { recursive: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  if (!folder) return NextResponse.json({ error: 'folder required' }, { status: 400 });
  try {
    fs.rmSync(safe(folder), { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { oldName, newName } = await req.json();
    if (!oldName || !newName?.trim()) return NextResponse.json({ error: 'oldName and newName required' }, { status: 400 });
    fs.renameSync(safe(oldName), safe(newName.trim()));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
