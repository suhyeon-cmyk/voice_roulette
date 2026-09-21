import { NextResponse } from 'next/server';
import { getAllServerRoulettesWithStats } from '@/lib/serverStorage';
import { calculateRemainingSpins } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getAllServerRoulettesWithStats();
    const roulettesWithDetails = data.map((item) => {
      const { remaining, isValidPeriod } = calculateRemainingSpins(item.roulette);
      return {
        ...item,
        remaining_spins: remaining,
        is_valid_period: isValidPeriod,
      };
    });

    const totalRoulettes = roulettesWithDetails.length;
    const totalItems = roulettesWithDetails.reduce((sum, r) => sum + r.itemCount, 0);
    const totalAudios = roulettesWithDetails.reduce((sum, r) => sum + r.audioCount, 0);
    const totalActiveSpins = roulettesWithDetails.reduce((sum, r) => sum + r.remaining_spins, 0);

    return NextResponse.json({
      roulettes: roulettesWithDetails,
      stats: {
        totalRoulettes,
        totalItems,
        totalAudios,
        totalActiveSpins,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
