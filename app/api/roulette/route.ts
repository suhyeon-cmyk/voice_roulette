import { NextRequest, NextResponse } from 'next/server';
import { getAllServerRoulettes, upsertServerRoulette } from '@/lib/serverStorage';
import { RouletteData, RouletteItem } from '@/types/roulette';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roulettes = await getAllServerRoulettes();
    return NextResponse.json({ roulettes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roulette = body.roulette as RouletteData;
    const items = body.items as RouletteItem[];

    if (!roulette || !roulette.id) {
      return NextResponse.json({ error: 'Invalid roulette data' }, { status: 400 });
    }

    const updated = await upsertServerRoulette(roulette, items || []);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to upsert roulette' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      roulette: updated.roulette,
      items: updated.items,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/roulette:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
