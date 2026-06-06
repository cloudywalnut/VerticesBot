import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { PID_FILE, LOG_FILE, BOT_DIR, AUTH_DIR, QR_FILE, WA_STATUS_FILE } from '@/lib/paths';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Stop bot if running
    if (fs.existsSync(PID_FILE)) {
      const { pid } = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
      try {
        if (process.platform === 'win32') {
          await execAsync(`taskkill /F /PID ${pid} /T`);
        } else {
          process.kill(-pid, 'SIGTERM');
        }
      } catch { /* already gone */ }
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    }

    // Delete WhatsApp auth session, QR, and connection state
    if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE);
    if (fs.existsSync(WA_STATUS_FILE)) fs.unlinkSync(WA_STATUS_FILE);

    // Start bot fresh
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
      return NextResponse.json({ ok: false, message: 'Failed to get bot PID after restart' }, { status: 500 });
    }

    fs.writeFileSync(PID_FILE, JSON.stringify({ pid: child.pid, startedAt: Date.now() }));

    return NextResponse.json({ ok: true, message: 'Bot restarted with fresh session', pid: child.pid });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
