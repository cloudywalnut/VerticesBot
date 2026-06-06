import { NextResponse } from 'next/server';
import fs from 'fs';
import { QR_FILE } from '@/lib/paths';

export async function GET() {
  try {
    if (!fs.existsSync(QR_FILE)) {
      return NextResponse.json({ error: 'QR not available' }, { status: 404 });
    }

    const stat = fs.statSync(QR_FILE);
    const buf = fs.readFileSync(QR_FILE);

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(stat.size),
        'Cache-Control': 'no-store',
        'Last-Modified': stat.mtime.toUTCString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
