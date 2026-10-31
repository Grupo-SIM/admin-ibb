import 'server-only';
import { cookies } from 'next/headers';

export const FINANCE_COOKIE = 'token';

export function churchApiUrl() {
  const url = new URL(process.env.API_URL || 'https://api-bosque.jbmidia.com');
  const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) throw new Error('Identity service unavailable');
  return url.toString().replace(/\/$/, '');
}

// Authenticate the existing church token with the church backend on EVERY request.
// Only current server-loaded roles authorize finance; browser role cookies are presentation only.
export async function authorizeFinance(token?: string) {
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${churchApiUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Unauthorized');
  const identity = await response.json();
  const roles = (process.env.FINANCE_ALLOWED_ROLES || 'admin,withdraw').split(',').map(role => role.trim()).filter(Boolean);
  if (!roles.length || typeof identity.id !== 'string' || !identity.id || !Array.isArray(identity.roles) || !identity.roles.some((role: unknown) => typeof role === 'string' && roles.includes(role))) throw new Error('Forbidden');
  return identity as { id: string; roles: string[] };
}

export async function requireFinanceIdentity() {
  return authorizeFinance((await cookies()).get(FINANCE_COOKIE)?.value);
}
