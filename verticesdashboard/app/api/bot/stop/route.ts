import { NextResponse } from 'next/server';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PID_FILE, QR_FILE, WA_STATUS_FILE } from '@/lib/paths';

const execAsync = promisify(exec);

export async function POST() {
  try {
    if (!fs.existsSync(PID_FILE)) {
      return NextResponse.json({ ok: false, message: 'Bot is not running' });
    }

    const { pid } = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));

    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /PID ${pid} /T`);
      } else {
        process.kill(-pid, 'SIGTERM');
      }
    } catch {
      // Process may already be gone — still clean up
    }

    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    if (fs.existsSync(WA_STATUS_FILE)) fs.unlinkSync(WA_STATUS_FILE);
    if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE);

    return NextResponse.json({ ok: true, message: 'Bot stopped' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
