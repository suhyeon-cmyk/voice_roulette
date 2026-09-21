import { NextRequest, NextResponse } from 'next/server';
import {
  getServerRouletteData,
  updateRouletteSpins,
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
    const data = await getServerRouletteData(id);

    if (!data) {
      return NextResponse.json({ error: 'Roulette not found' }, { status: 404 });
    }

    const { remaining, isValidPeriod, isDateReset } = calculateRemainingSpins(data.roulette);

    if (isDateReset) {
      const today = new Date().toISOString().slice(0, 10);
      const updated = await updateRouletteSpins(id, {
        used_spins: 0,
        last_reset_date: today,
      });
      if (updated) {
        data.roulette = updated;
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

    const data = await getServerRouletteData(id);
    if (!data || !data.roulette) {
      return NextResponse.json({ error: 'Roulette not found' }, { status: 404 });
    }

    const currentRoulette = data.roulette;
    const today = new Date().toISOString().slice(0, 10);

    if (action === 'consume') {
      const newUsed = (currentRoulette.used_spins || 0) + 1;
      const updated = await updateRouletteSpins(id, {
        used_spins: newUsed,
        last_reset_date: today,
      });
      const activeRoulette = updated || { ...currentRoulette, used_spins: newUsed, last_reset_date: today };
      const { remaining } = calculateRemainingSpins(activeRoulette);
      return NextResponse.json({ success: true, remaining_spins: remaining, roulette: activeRoulette });
    }

    if (action === 'adjust_bonus') {
      const newBonus = (currentRoulette.bonus_spins || 0) + (Number(delta) || 0);
      const updated = await updateRouletteSpins(id, {
        bonus_spins: newBonus,
      });
      const activeRoulette = updated || { ...currentRoulette, bonus_spins: newBonus };
      const { remaining } = calculateRemainingSpins(activeRoulette);
      return NextResponse.json({ success: true, remaining_spins: remaining, roulette: activeRoulette });
    }

    if (action === 'reset_spins') {
      const updated = await updateRouletteSpins(id, {
        used_spins: 0,
        bonus_spins: 0,
        last_reset_date: today,
      });
      const activeRoulette = updated || { ...currentRoulette, used_spins: 0, bonus_spins: 0, last_reset_date: today };
      const { remaining } = calculateRemainingSpins(activeRoulette);
      return NextResponse.json({ success: true, remaining_spins: remaining, roulette: activeRoulette });
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
    const deleted = await deleteServerRoulette(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Roulette not found or delete failed' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Roulette deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
