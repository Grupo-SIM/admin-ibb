import { NextRequest, NextResponse } from 'next/server';

const MACHINE_API_URL = 'https://simpay-back.simintermediacoes.com';
const INTERNAL_TOKEN = process.env.MACHINE_INTERNAL_TOKEN ?? process.env.API_MACHINE_INTERNAL_TOKEN ?? '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const path = segments.join('/');
  const search = request.nextUrl.search;
  const url = `${MACHINE_API_URL}/internal/${path}${search}`;

  const response = await fetch(url, {
    headers: {
      'x-internal-token': INTERNAL_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const path = segments.join('/');
  const search = request.nextUrl.search;
  const url = `${MACHINE_API_URL}/internal/${path}${search}`;
  const body = await request.text();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-internal-token': INTERNAL_TOKEN,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
