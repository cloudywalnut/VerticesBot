import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { IMG_DIR } from '@/lib/paths';

export async function POST(req: NextRequest) {
  const folder = new URL(req.url).searchParams.get('folder');
  if (!folder) return NextResponse.json({ error: 'folder required' }, { status: 400 });

  const folderPath = path.resolve(path.join(IMG_DIR, folder));
  if (!folderPath.startsWith(path.resolve(IMG_DIR))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    fs.mkdirSync(folderPath, { recursive: true });

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(folderPath, file.name), Buffer.from(bytes));
    }

    return NextResponse.json({ ok: true, count: files.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
