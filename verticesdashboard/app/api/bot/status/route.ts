import { NextResponse } from 'next/server';
import fs from 'fs';
import { PID_FILE, WA_STATUS_FILE } from '@/lib/paths';

export async function GET() {
  try {
    // Check if process is alive
    let running = false;
    let uptime: number | null = null;

    if (fs.existsSync(PID_FILE)) {
      const { pid, startedAt } = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
      try {
        process.kill(pid, 0);
        running = true;
        uptime = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : null;
      } catch {
        fs.unlinkSync(PID_FILE);
      }
    }

    // Read WhatsApp connection state written by the bot
    let waState: 'qr' | 'open' | 'close' | null = null;
    if (running && fs.existsSync(WA_STATUS_FILE)) {
      try {
        const { state } = JSON.parse(fs.readFileSync(WA_STATUS_FILE, 'utf-8'));
        waState = state ?? null;
      } catch { /* stale/corrupt file — treat as null */ }
    }

    return NextResponse.json({ running, waState, uptime });
  } catch {
    return NextResponse.json({ running: false, waState: null, uptime: null });
  }
}
