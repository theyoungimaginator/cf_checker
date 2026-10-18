import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle')?.trim();
  const from = Number(request.nextUrl.searchParams.get('from') || '1');
  const count = Number(request.nextUrl.searchParams.get('count') || '1000');

  if (!handle || !/^[a-zA-Z0-9_.-]{1,24}$/.test(handle)) {
    return NextResponse.json({ error: 'Enter a valid Codeforces handle.' }, { status: 400 });
  }
  if (!Number.isInteger(from) || from < 1 || !Number.isInteger(count) || count < 1 || count > 1000) {
    return NextResponse.json({ error: 'Invalid page range.' }, { status: 400 });
  }

  try {
    const url = new URL('https://codeforces.com/api/user.status');
    url.searchParams.set('handle', handle);
    url.searchParams.set('from', String(from));
    url.searchParams.set('count', String(count));
    const response = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'CF-Ledger/1.0' } });
    const payload = await response.json();
    if (!response.ok || payload.status !== 'OK') {
      const message = typeof payload.comment === 'string' ? payload.comment : 'Codeforces could not return submissions right now.';
      return NextResponse.json({ error: message }, { status: response.status || 502 });
    }
    return NextResponse.json({ result: payload.result, count: payload.result.length });
  } catch {
    return NextResponse.json({ error: 'Could not reach Codeforces. Try again in a moment.' }, { status: 502 });
  }
}
