import { isSameOrigin } from '@/services/same-origin';
import { NextResponse } from "next/server";
import { churchApiUrl } from '@/services/finance-auth';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string') return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
    const upstream = await fetch(`${churchApiUrl()}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return NextResponse.json({ error: upstream.status === 401 || upstream.status === 403 ? "Credenciais inválidas." : "Não foi possível entrar. Tente novamente." }, { status: upstream.status >= 500 ? 502 : upstream.status });
    const data = await upstream.json();
    if (typeof data.token !== 'string' || !data.token || typeof data.user?.roles !== 'string') return NextResponse.json({ error: "Resposta inválida do servidor." }, { status: 502 });
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    const options = { maxAge: 23 * 60 * 60, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
    response.cookies.set("token", data.token, { ...options, httpOnly: true });
    response.cookies.set("roles", data.user.roles, options);
    response.cookies.delete("finance-session");
    return response;
  } catch { return NextResponse.json({ error: "Não foi possível conectar ao servidor. Tente novamente." }, { status: 502 }); }
}
