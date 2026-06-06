import path from 'path';

export const ROOT = path.join(process.cwd(), '..');
export const USERDATA = path.join(ROOT, 'userdata');
export const BOT_DIR = path.join(ROOT, 'Vertices');
export const ENV_FILE = path.join(USERDATA, '.env');
export const PERSONA_DIR = path.join(USERDATA, 'persona');
export const MEM_DIR = path.join(USERDATA, 'mem');
export const CHAT_DIR = path.join(USERDATA, 'chathistory');
export const QR_FILE = path.join(USERDATA, 'qr', 'qr.png');
export const AUTH_DIR = path.join(USERDATA, 'whatsapp', 'session-Vertices');
export const WA_STATUS_FILE = path.join(USERDATA, 'json', 'wa-status.json');
export const PID_FILE  = path.join(USERDATA, 'json', 'bot-pid.json');
export const LOG_FILE  = path.join(USERDATA, 'json', 'bot.log');
export const PAUSE_FILE = path.join(USERDATA, 'json', 'pausedUsers.json');
export const IMG_DIR   = path.join(USERDATA, 'img');
