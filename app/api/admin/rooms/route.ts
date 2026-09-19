import { NextResponse } from 'next/server';
import { getAllServerRoomsWithStats } from '@/lib/serverStorage';
import { calculateRemainingSpins } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getAllServerRoomsWithStats();
    const roomsWithDetails = data.map((item) => {
      const { remaining, isValidPeriod } = calculateRemainingSpins(item.room);
      return {
        ...item,
        remaining_spins: remaining,
        is_valid_period: isValidPeriod,
      };
    });

    const totalRooms = roomsWithDetails.length;
    const totalItems = roomsWithDetails.reduce((sum, r) => sum + r.itemCount, 0);
    const totalAudios = roomsWithDetails.reduce((sum, r) => sum + r.audioCount, 0);
    const totalActiveSpins = roomsWithDetails.reduce((sum, r) => sum + r.remaining_spins, 0);

    return NextResponse.json({
      rooms: roomsWithDetails,
      stats: {
        totalRooms,
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
