import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL('/api/roulette', request.url);
  return NextResponse.redirect(url, 308);
}

export async function POST(request: NextRequest) {
  const url = new URL('/api/roulette', request.url);
  return NextResponse.redirect(url, 308);
}
