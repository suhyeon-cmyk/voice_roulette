import { NextRequest, NextResponse } from 'next/server';
import { getServerRoomData, getAllServerRooms, saveAllServerRooms, deleteServerRoom } from '@/lib/serverStorage';
import { calculateRemainingSpins } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = getServerRoomData(id);

    if (!data) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const { remaining, isValidPeriod, isDateReset } = calculateRemainingSpins(data.room);

    if (isDateReset) {
      const rooms = getAllServerRooms();
      const r = rooms.find((item) => item.id === id);
      if (r) {
        r.used_spins = 0;
        r.last_reset_date = new Date().toISOString().slice(0, 10);
        saveAllServerRooms(rooms);
        data.room.used_spins = 0;
        data.room.last_reset_date = r.last_reset_date;
      }
    }

    return NextResponse.json({
      room: data.room,
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

    const rooms = getAllServerRooms();
    const room = rooms.find((r) => r.id === id);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (action === 'consume') {
      room.used_spins = (room.used_spins || 0) + 1;
      room.last_reset_date = new Date().toISOString().slice(0, 10);
      saveAllServerRooms(rooms);
      const { remaining } = calculateRemainingSpins(room);
      return NextResponse.json({ success: true, remaining_spins: remaining, room });
    }

    if (action === 'adjust_bonus') {
      room.bonus_spins = (room.bonus_spins || 0) + (Number(delta) || 0);
      room.updated_at = new Date().toISOString();
      saveAllServerRooms(rooms);
      const { remaining } = calculateRemainingSpins(room);
      return NextResponse.json({ success: true, remaining_spins: remaining, room });
    }

    if (action === 'reset_spins') {
      room.used_spins = 0;
      room.bonus_spins = 0;
      room.last_reset_date = new Date().toISOString().slice(0, 10);
      room.updated_at = new Date().toISOString();
      saveAllServerRooms(rooms);
      const { remaining } = calculateRemainingSpins(room);
      return NextResponse.json({ success: true, remaining_spins: remaining, room });
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
    const deleted = deleteServerRoom(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Room deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
