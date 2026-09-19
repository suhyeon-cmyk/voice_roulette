import fs from 'fs';
import path from 'path';
import os from 'os';
import { RouletteItem, RouletteRoom } from '@/types/roulette';

import defaultRoomsData from '@/data/roulette.json';
import defaultItemsData from '@/data/roulette_items.json';
import defaultSuggestionsData from '@/data/suggestions.json';

const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION
);

const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'voice_roulette_data')
  : path.join(process.cwd(), 'data');

const ROOMS_FILE = path.join(DATA_DIR, 'roulette.json');
const ROOM_ITEMS_FILE = path.join(DATA_DIR, 'roulette_items.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin.json');

declare global {
  // eslint-disable-next-line no-var
  var __vr_rooms_cache: RouletteRoom[] | undefined;
  // eslint-disable-next-line no-var
  var __vr_items_cache: RouletteItem[] | undefined;
  // eslint-disable-next-line no-var
  var __vr_admin_cache: { password?: string; updated_at?: string } | undefined;
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function getAllServerRooms(): RouletteRoom[] {
  if (globalThis.__vr_rooms_cache && globalThis.__vr_rooms_cache.length > 0) {
    return globalThis.__vr_rooms_cache;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const rooms = JSON.parse(raw);
      if (Array.isArray(rooms) && rooms.length > 0) {
        globalThis.__vr_rooms_cache = rooms;
        return rooms;
      }
    }
  } catch {}

  const initial = Array.isArray(defaultRoomsData) ? (defaultRoomsData as RouletteRoom[]) : [];
  globalThis.__vr_rooms_cache = initial;
  return initial;
}

export function saveAllServerRooms(rooms: RouletteRoom[]) {
  globalThis.__vr_rooms_cache = rooms;
  ensureDataDir();
  try {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8');
  } catch {}
}

export function getAllServerItems(): RouletteItem[] {
  if (globalThis.__vr_items_cache && globalThis.__vr_items_cache.length > 0) {
    return globalThis.__vr_items_cache;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(ROOM_ITEMS_FILE)) {
      const raw = fs.readFileSync(ROOM_ITEMS_FILE, 'utf-8');
      const items = JSON.parse(raw);
      if (Array.isArray(items) && items.length > 0) {
        globalThis.__vr_items_cache = items;
        return items;
      }
    }
  } catch {}

  const initial = Array.isArray(defaultItemsData) ? (defaultItemsData as RouletteItem[]) : [];
  globalThis.__vr_items_cache = initial;
  return initial;
}

export function saveAllServerItems(items: RouletteItem[]) {
  globalThis.__vr_items_cache = items;
  ensureDataDir();
  try {
    fs.writeFileSync(ROOM_ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch {}
}

export function getPresetRecommendations(): string[] {
  return Array.isArray(defaultSuggestionsData) ? (defaultSuggestionsData as string[]) : [];
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

export function getMasterAdminPassword(): string {
  if (globalThis.__vr_admin_cache?.password) {
    return globalThis.__vr_admin_cache.password;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const raw = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.password) {
        globalThis.__vr_admin_cache = data;
        return data.password;
      }
    }
  } catch {}
  return process.env.ADMIN_PASSWORD || 'admin1234';
}

export function saveMasterAdminPassword(newPassword: string): boolean {
  globalThis.__vr_admin_cache = {
    password: newPassword,
    updated_at: new Date().toISOString(),
  };
  ensureDataDir();
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(globalThis.__vr_admin_cache, null, 2), 'utf-8');
  } catch {}

  // Also sync with .env file if in a writable local dev environment
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
  } catch {}

  return true;
}
