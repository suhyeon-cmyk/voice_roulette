import { NextRequest, NextResponse } from 'next/server';
import { getAllServerRooms, upsertServerRoom } from '@/lib/serverStorage';
import { RouletteRoom, RouletteItem } from '@/types/roulette';

export async function GET() {
  const rooms = getAllServerRooms();
  return NextResponse.json({ rooms });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room, items } = body as { room: RouletteRoom; items: RouletteItem[] };

    if (!room || !room.id) {
      return NextResponse.json({ error: 'Invalid room data' }, { status: 400 });
    }

    const updated = upsertServerRoom(room, items || []);

    return NextResponse.json({ success: true, ...updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
