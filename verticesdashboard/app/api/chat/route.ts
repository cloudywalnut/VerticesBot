import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CHAT_DIR } from '@/lib/paths';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';

  try {
    fs.mkdirSync(CHAT_DIR, { recursive: true });

    if (!file) {
      // List all chat JSON files
      const files = fs.readdirSync(CHAT_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const stat = fs.statSync(path.join(CHAT_DIR, f));
          return { name: f, phone: f.replace('.json', ''), modified: stat.mtime.toISOString() };
        })
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      return NextResponse.json({ files });
    }

    // Get chat content for a specific file
    const filePath = path.join(CHAT_DIR, file.endsWith('.json') ? file : `${file}.json`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ messages: [] });
    }

    let messages: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      messages = messages.filter(m =>
        (m.user_message || m.userMessage || '').toLowerCase().includes(q) ||
        (m.Vertices_response || m.vertices_response || '').toLowerCase().includes(q) ||
        (m.user_name || m.userName || '').toLowerCase().includes(q)
      );
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      messages = messages.filter(m => new Date(m.datetime || m.timestamp || 0).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // include end day
      messages = messages.filter(m => new Date(m.datetime || m.timestamp || 0).getTime() <= end);
    }

    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');

  if (!file) return NextResponse.json({ error: 'No file specified' }, { status: 400 });

  try {
    const filePath = path.join(CHAT_DIR, file.endsWith('.json') ? file : `${file}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
