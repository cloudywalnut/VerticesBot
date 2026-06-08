export const COOKIE_NAME = 'auth_token';
export const MAX_AGE_SECS = 7 * 24 * 60 * 60; // 7 days

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
}

export async function signToken(secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(timestamp));
  return `${timestamp}:${toHex(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<boolean> {
  const colon = token.indexOf(':');
  if (colon === -1) return false;
  const timestamp = token.slice(0, colon);
  const hex = token.slice(colon + 1);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const age = Math.floor(Date.now() / 1000) - ts;
  if (age < 0 || age > MAX_AGE_SECS) return false;
  try {
    const key = await getKey(secret);
    return crypto.subtle.verify('HMAC', key, fromHex(hex), enc.encode(timestamp));
  } catch {
    return false;
  }
}
