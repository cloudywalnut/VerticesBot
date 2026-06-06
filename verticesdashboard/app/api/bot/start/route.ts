import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { PID_FILE, LOG_FILE, BOT_DIR, QR_FILE, WA_STATUS_FILE } from '@/lib/paths';

export async function POST() {
  try {
    // Check if already running
    if (fs.existsSync(PID_FILE)) {
      const { pid } = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
      try {
        process.kill(pid, 0);
        return NextResponse.json({ ok: false, message: 'Bot is already running', pid });
      } catch {
        fs.unlinkSync(PID_FILE);
      }
    }

    // Clear stale state from previous run
    if (fs.existsSync(WA_STATUS_FILE)) fs.unlinkSync(WA_STATUS_FILE);
    if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE);

    const logDir = path.dirname(LOG_FILE);
    fs.mkdirSync(logDir, { recursive: true });

    const logFd = fs.openSync(LOG_FILE, 'a');
    const child = spawn('node', ['Vertices.js'], {
      cwd: BOT_DIR,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    });
    child.unref();
    fs.closeSync(logFd);

    if (!child.pid) {
      return NextResponse.json({ ok: false, message: 'Failed to get bot PID' }, { status: 500 });
    }

    fs.writeFileSync(PID_FILE, JSON.stringify({ pid: child.pid, startedAt: Date.now() }));

    return NextResponse.json({ ok: true, message: 'Bot started', pid: child.pid });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
