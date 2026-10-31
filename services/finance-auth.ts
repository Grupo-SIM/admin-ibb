import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const signature = (value: string, key: string) => createHmac('sha256', key).update(value).digest('base64url');
const matches = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function verifyChurchToken(token: string): string {
  const key = process.env.FINANCE_CHURCH_JWT_SECRET;
  const issuer = process.env.FINANCE_CHURCH_JWT_ISSUER;
  const audience = process.env.FINANCE_CHURCH_JWT_AUDIENCE;
  if (!key || !issuer || !audience) throw new Error('Finance identity is not configured');
  const parts = token.split('.');
  if (parts.length !== 3 || !matches(signature(`${parts[0]}.${parts[1]}`, key), parts[2])) throw new Error('Invalid identity');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  if (header.alg !== 'HS256' || payload.iss !== issuer || !(payload.aud === audience || (Array.isArray(payload.aud) && payload.aud.includes(audience))) || typeof payload.sub !== 'string' || !payload.sub || typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000 || (payload.nbf && payload.nbf > Date.now() / 1000)) throw new Error('Expired or invalid identity');
  return payload.sub;
}

export function signSession(token: string) {
  verifyChurchToken(token);
  const key = process.env.FINANCE_SESSION_SECRET;
  if (!key || key.length < 32) throw new Error('Session signing is not configured');
  const data = Buffer.from(JSON.stringify({ token, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${data}.${signature(data, key)}`;
}

export async function requireFinanceIdentity() {
  const key = process.env.FINANCE_SESSION_SECRET;
  const session = (await cookies()).get('finance-session')?.value;
  if (!key || key.length < 32 || !session) throw new Error('Unauthorized');
  const [data, mac, extra] = session.split('.');
  if (!data || !mac || extra || !matches(signature(data, key), mac)) throw new Error('Unauthorized');
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  if (typeof payload.expires !== 'number' || payload.expires <= Date.now() || typeof payload.token !== 'string') throw new Error('Unauthorized');
  const subject = verifyChurchToken(payload.token);
  const endpoint = process.env.FINANCE_IDENTITY_URL;
  const roles = process.env.FINANCE_ALLOWED_ROLES?.split(',').map(role => role.trim()).filter(Boolean);
  if (!endpoint || !roles?.length || new URL(endpoint).protocol !== 'https:') throw new Error('Identity validation unavailable');
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${payload.token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Unauthorized');
  const identity = await response.json();
  if (identity.id !== subject || !Array.isArray(identity.roles) || !identity.roles.some((role: unknown) => typeof role === 'string' && roles.includes(role))) throw new Error('Forbidden');
}
