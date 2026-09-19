import fs from 'fs';
import path from 'path';
import { RouletteItem, RouletteRoom } from '@/types/roulette';

const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'roulette.json');
const ROOM_ITEMS_FILE = path.join(DATA_DIR, 'roulette_items.json');
const RECOMMENDATIONS_FILE = path.join(DATA_DIR, 'suggestions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getAllServerRooms(): RouletteRoom[] {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return [];
    const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
    const rooms = JSON.parse(raw);
    return Array.isArray(rooms) ? rooms : [];
  } catch {
    return [];
  }
}

export function saveAllServerRooms(rooms: RouletteRoom[]) {
  ensureDataDir();
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
}

export function getAllServerItems(): RouletteItem[] {
  try {
    if (!fs.existsSync(ROOM_ITEMS_FILE)) return [];
    const raw = fs.readFileSync(ROOM_ITEMS_FILE, 'utf-8');
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveAllServerItems(items: RouletteItem[]) {
  ensureDataDir();
  fs.writeFileSync(ROOM_ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

export function getPresetRecommendations(): string[] {
  try {
    if (!fs.existsSync(RECOMMENDATIONS_FILE)) return [];
    const raw = fs.readFileSync(RECOMMENDATIONS_FILE, 'utf-8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getServerRoomData(roomId: string): { room: RouletteRoom; items: RouletteItem[] } | null {
  const rooms = getAllServerRooms();
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const allItems = getAllServerItems();
  const items = allItems.filter((it) => (it.roulette_id || it.room_id) === roomId);

  return { room, items };
}

export function upsertServerRoom(room: RouletteRoom, items: RouletteItem[]) {
  const rooms = getAllServerRooms();
  const existingIdx = rooms.findIndex((r) => r.id === room.id);
  if (existingIdx >= 0) {
    rooms[existingIdx] = room;
  } else {
    rooms.unshift(room);
  }
  saveAllServerRooms(rooms);

  const currentItems = getAllServerItems().filter((it) => (it.roulette_id || it.room_id) !== room.id);
  const newItems = items.map((it, idx) => ({
    ...it,
    id: it.id || crypto.randomUUID(),
    roulette_id: room.id,
    sort_order: idx,
  }));
  saveAllServerItems([...currentItems, ...newItems]);

  return { room, items: newItems };
}

export function deleteServerRoom(roomId: string): boolean {
  const rooms = getAllServerRooms();
  const filteredRooms = rooms.filter((r) => r.id !== roomId);
  if (filteredRooms.length === rooms.length) {
    return false;
  }
  saveAllServerRooms(filteredRooms);

  const items = getAllServerItems();
  const filteredItems = items.filter((it) => (it.roulette_id || it.room_id) !== roomId);
  saveAllServerItems(filteredItems);

  return true;
}

export interface AdminRoomStats {
  room: RouletteRoom;
  items: RouletteItem[];
  itemCount: number;
  audioCount: number;
  totalProbability: number;
}

export function getAllServerRoomsWithStats(): AdminRoomStats[] {
  const rooms = getAllServerRooms();
  const allItems = getAllServerItems();

  return rooms.map((room) => {
    const items = allItems.filter((it) => (it.roulette_id || it.room_id) === room.id);
    const audioCount = items.filter((it) => Boolean(it.audio_url)).length;
    const totalProbability = items.reduce((acc, it) => acc + (Number(it.probability) || 0), 0);
    return {
      room,
      items,
      itemCount: items.length,
      audioCount,
      totalProbability,
    };
  });
}

const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin.json');

export function getMasterAdminPassword(): string {
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const raw = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.password) {
        return data.password;
      }
    }
  } catch {}
  return process.env.ADMIN_PASSWORD || 'admin1234';
}

export function saveMasterAdminPassword(newPassword: string): boolean {
  ensureDataDir();
  const data = {
    password: newPassword,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');

  // Also sync with .env file if it exists
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (content.includes('ADMIN_PASSWORD=')) {
        content = content.replace(/ADMIN_PASSWORD=.*(?:\r?\n|$)/, `ADMIN_PASSWORD=${newPassword}\n`);
      } else {
        content += `\nADMIN_PASSWORD=${newPassword}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    }
  } catch (err) {
    console.warn('Failed to sync with .env:', err);
  }

  return true;
}

