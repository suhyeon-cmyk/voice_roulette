import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL('/api/admin/roulette', request.url);
  return NextResponse.redirect(url, 308);
}
