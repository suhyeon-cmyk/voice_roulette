import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(`/api/roulette/${id}`, request.url);
  return NextResponse.redirect(url, 308);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(`/api/roulette/${id}`, request.url);
  return NextResponse.redirect(url, 308);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(`/api/roulette/${id}`, request.url);
  return NextResponse.redirect(url, 308);
}
