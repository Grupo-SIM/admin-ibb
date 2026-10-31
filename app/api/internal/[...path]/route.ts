import { NextResponse } from 'next/server';

// No verified, platform-scoped machine contract is available. Never proxy arbitrary internal paths.
function blocked() {
  return NextResponse.json({ message: 'Maquinetas indisponíveis até existir um contrato seguro de autorização.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
export const GET = blocked;
export const POST = blocked;
