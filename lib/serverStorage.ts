import fs from 'fs';
import path from 'path';
import os from 'os';
import { RouletteItem, RouletteData } from '@/types/roulette';

import defaultSuggestionsData from '@/data/suggestions.json';

const IS_SERVERLESS = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION
);

const DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'voice_roulette_data')
  : path.join(process.cwd(), 'data');

const ROULETTE_FILE = path.join(DATA_DIR, 'roulette.json');
const ROULETTE_ITEMS_FILE = path.join(DATA_DIR, 'roulette_items.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin.json');

declare global {
  // eslint-disable-next-line no-var
  var __vr_roulettes_cache: RouletteData[] | undefined;
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

export function getAllServerRoulettes(): RouletteData[] {
  if (Array.isArray(globalThis.__vr_roulettes_cache)) {
    return globalThis.__vr_roulettes_cache;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(ROULETTE_FILE)) {
      const raw = fs.readFileSync(ROULETTE_FILE, 'utf-8');
      const roulettes = JSON.parse(raw);
      if (Array.isArray(roulettes)) {
        globalThis.__vr_roulettes_cache = roulettes;
        return roulettes;
      }
    }
  } catch {}

  const initial: RouletteData[] = [];
  globalThis.__vr_roulettes_cache = initial;
  return initial;
}

export function saveAllServerRoulettes(roulettes: RouletteData[]) {
  globalThis.__vr_roulettes_cache = roulettes;
  ensureDataDir();
  try {
    fs.writeFileSync(ROULETTE_FILE, JSON.stringify(roulettes, null, 2), 'utf-8');
  } catch {}
}

export function getAllServerItems(): RouletteItem[] {
  if (Array.isArray(globalThis.__vr_items_cache)) {
    return globalThis.__vr_items_cache;
  }
  ensureDataDir();
  try {
    if (fs.existsSync(ROULETTE_ITEMS_FILE)) {
      const raw = fs.readFileSync(ROULETTE_ITEMS_FILE, 'utf-8');
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        globalThis.__vr_items_cache = items;
        return items;
      }
    }
  } catch {}

  const initial: RouletteItem[] = [];
  globalThis.__vr_items_cache = initial;
  return initial;
}

export function saveAllServerItems(items: RouletteItem[]) {
  globalThis.__vr_items_cache = items;
  ensureDataDir();
  try {
    fs.writeFileSync(ROULETTE_ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch {}
}

export function getPresetRecommendations(): string[] {
  return Array.isArray(defaultSuggestionsData) ? (defaultSuggestionsData as string[]) : [];
}

export function getServerRouletteData(rouletteId: string): { roulette: RouletteData; items: RouletteItem[] } | null {
  const roulettes = getAllServerRoulettes();
  const roulette = roulettes.find((r) => r.id === rouletteId);
  if (!roulette) return null;

  const allItems = getAllServerItems();
  const items = allItems.filter((it) => it.roulette_id === rouletteId);

  return { roulette, items };
}

export function upsertServerRoulette(roulette: RouletteData, items: RouletteItem[]) {
  const roulettes = getAllServerRoulettes();
  const existingIdx = roulettes.findIndex((r) => r.id === roulette.id);
  if (existingIdx >= 0) {
    roulettes[existingIdx] = roulette;
  } else {
    roulettes.unshift(roulette);
  }
  saveAllServerRoulettes(roulettes);

  const currentItems = getAllServerItems().filter((it) => it.roulette_id !== roulette.id);
  const newItems = items.map((it, idx) => ({
    ...it,
    id: it.id || crypto.randomUUID(),
    roulette_id: roulette.id,
    sort_order: idx,
  }));
  saveAllServerItems([...currentItems, ...newItems]);

  return { roulette, items: newItems };
}

export function deleteServerRoulette(rouletteId: string): boolean {
  ensureDataDir();
  const trimmedId = rouletteId.trim();

  let roulettes = getAllServerRoulettes();
  roulettes = roulettes.filter((r) => r.id !== trimmedId);
  saveAllServerRoulettes(roulettes);

  let items = getAllServerItems();
  items = items.filter((it) => it.roulette_id !== trimmedId);
  saveAllServerItems(items);

  return true;
}

export interface AdminRouletteStats {
  roulette: RouletteData;
  items: RouletteItem[];
  itemCount: number;
  audioCount: number;
  totalProbability: number;
}

export function getAllServerRoulettesWithStats(): AdminRouletteStats[] {
  const roulettes = getAllServerRoulettes();
  const allItems = getAllServerItems();

  return roulettes.map((roulette) => {
    const items = allItems.filter((it) => it.roulette_id === roulette.id);
    const audioCount = items.filter((it) => Boolean(it.audio_url)).length;
    const totalProbability = items.reduce((acc, it) => acc + (Number(it.probability) || 0), 0);
    return {
      roulette,
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
