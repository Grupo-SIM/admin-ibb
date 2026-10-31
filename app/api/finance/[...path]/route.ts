import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceIdentity } from '@/services/finance-auth';

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const headers = { 'Cache-Control': 'no-store' };
  try { await requireFinanceIdentity(); } catch { return NextResponse.json({ message: 'Acesso financeiro não autorizado ou validação de identidade indisponível.' }, { status: 403, headers }); }
  const path = (await context.params).path;
  const resource = path[0];
  const receipt = request.method === 'GET' && path.length === 3 && resource === 'withdrawals' && /^[a-zA-Z0-9-]{1,100}$/.test(path[1]) && path[2] === 'receipt';
  const detail = resource === 'withdrawals' && path.length === 2 && /^[a-zA-Z0-9-]{1,100}$/.test(path[1]);
  const collection = path.length === 1 && ['summary', 'config', 'transactions', 'withdrawals', 'reconcile'].includes(resource);
  if ((!collection && !detail && !receipt) || (request.method === 'POST' && !(path.length === 1 && ['withdrawals', 'reconcile'].includes(resource))) || (resource === 'reconcile' && request.method !== 'POST')) return NextResponse.json({ message: 'Rota não permitida' }, { status: 404, headers });
  const allowed = request.method === 'GET' && collection && ['transactions', 'withdrawals'].includes(resource) ? ['page', 'limit', 'status', ...(resource === 'transactions' ? ['paymentMethod', 'startDate', 'endDate', 'search'] : [])] : [];
  const query = request.nextUrl.searchParams;
  for (const [name, value] of query) {
    if (!allowed.includes(name) || query.getAll(name).length !== 1 || value.length > 200 || (['page', 'limit'].includes(name) && (!/^[1-9]\d*$/.test(value) || Number(value) > (name === 'limit' ? 100 : 100000)))) return NextResponse.json({ message: 'Filtro inválido' }, { status: 400, headers });
  }
  let body: string | undefined;
  if (request.method === 'POST') {
    if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ message: 'Origem inválida' }, { status: 403, headers });
    if (resource === 'reconcile') { if ((await request.text()).length) return NextResponse.json({ message: 'Solicitação inválida' }, { status: 400, headers }); }
    else try {
      const raw = await request.text();
      if (raw.length > 2048) throw new Error();
      const input = JSON.parse(raw);
      if (Object.keys(input).sort().join(',') !== 'amountCents,idempotencyKey,pixKey' || !Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 || typeof input.pixKey !== 'string' || !input.pixKey.trim() || input.pixKey.length > 200 || typeof input.idempotencyKey !== 'string' || !/^[\w-]{16,100}$/.test(input.idempotencyKey)) throw new Error();
      body = JSON.stringify(input);
    } catch { return NextResponse.json({ message: 'Solicitação inválida' }, { status: 400, headers }); }
  }
  try {
    const host = new URL(process.env.SIMINTPAY_API_URL || '');
    const token = process.env.SIMINTPAY_TOKEN;
    if (!token || host.protocol !== 'https:' || host.username || host.password || host.search || host.hash || host.pathname !== '/') throw new Error();
    const url = new URL(`/platforms/BOSQUE/finance/${path.join('/')}`, host);
    url.search = query.toString();
    const response = await fetch(url, { method: request.method, headers: { 'x-access-token': token, 'Content-Type': 'application/json' }, body, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) return NextResponse.json({ message: 'Não foi possível concluir a operação financeira.' }, { status: response.status >= 500 ? 502 : response.status, headers });
    if (receipt) {
      const type = response.headers.get('content-type')?.split(';')[0];
      if (!type || !['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(type)) return NextResponse.json({ message: 'Comprovante inválido.' }, { status: 502, headers });
      return new NextResponse(response.body, { headers: { ...headers, 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" } });
    }
    const data = await response.json();
    return NextResponse.json(data, { headers });
  } catch { return NextResponse.json({ message: 'Serviço financeiro indisponível.' }, { status: 503, headers }); }
}
export const GET = handle;
export const POST = handle;
