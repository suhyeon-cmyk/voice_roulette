import { NextRequest, NextResponse } from 'next/server';
import {
  getServerRouletteData,
  getAllServerRoulettes,
  saveAllServerRoulettes,
  deleteServerRoulette,
} from '@/lib/serverStorage';
import { calculateRemainingSpins } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = getServerRouletteData(id);

    if (!data) {
      return NextResponse.json({ error: 'Roulette not found' }, { status: 404 });
    }

    const { remaining, isValidPeriod, isDateReset } = calculateRemainingSpins(data.roulette);

    if (isDateReset) {
      const roulettes = getAllServerRoulettes();
      const r = roulettes.find((item) => item.id === id);
      if (r) {
        r.used_spins = 0;
        r.last_reset_date = new Date().toISOString().slice(0, 10);
        saveAllServerRoulettes(roulettes);
        data.roulette.used_spins = 0;
        data.roulette.last_reset_date = r.last_reset_date;
      }
    }

    return NextResponse.json({
      roulette: data.roulette,
      items: data.items,
      remaining_spins: remaining,
      is_valid_period: isValidPeriod,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action, delta } = body;

    const roulettes = getAllServerRoulettes();
    const roulette = roulettes.find((r) => r.id === id);

    if (!roulette) {
      return NextResponse.json({ error: 'Roulette not found' }, { status: 404 });
    }

    if (action === 'consume') {
      roulette.used_spins = (roulette.used_spins || 0) + 1;
      roulette.last_reset_date = new Date().toISOString().slice(0, 10);
      saveAllServerRoulettes(roulettes);
      const { remaining } = calculateRemainingSpins(roulette);
      return NextResponse.json({ success: true, remaining_spins: remaining, roulette });
    }

    if (action === 'adjust_bonus') {
      roulette.bonus_spins = (roulette.bonus_spins || 0) + (Number(delta) || 0);
      roulette.updated_at = new Date().toISOString();
      saveAllServerRoulettes(roulettes);
      const { remaining } = calculateRemainingSpins(roulette);
      return NextResponse.json({ success: true, remaining_spins: remaining, roulette });
    }

    if (action === 'reset_spins') {
      roulette.used_spins = 0;
      roulette.bonus_spins = 0;
      roulette.last_reset_date = new Date().toISOString().slice(0, 10);
      roulette.updated_at = new Date().toISOString();
      saveAllServerRoulettes(roulettes);
      const { remaining } = calculateRemainingSpins(roulette);
      return NextResponse.json({ success: true, remaining_spins: remaining, roulette });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = deleteServerRoulette(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Roulette not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Roulette deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
