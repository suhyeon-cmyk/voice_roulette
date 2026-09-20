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

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function getAllServerRoulettes(): RouletteData[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ROULETTE_FILE)) {
      const raw = fs.readFileSync(ROULETTE_FILE, 'utf-8');
      if (raw.trim()) {
        const roulettes = JSON.parse(raw);
        if (Array.isArray(roulettes)) {
          return roulettes;
        }
      }
    }
  } catch (err) {
    console.error('Error reading roulettes file:', err);
  }

  return [];
}

export function saveAllServerRoulettes(roulettes: RouletteData[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(ROULETTE_FILE, JSON.stringify(roulettes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing roulettes file:', err);
  }
}

export function getAllServerItems(): RouletteItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ROULETTE_ITEMS_FILE)) {
      const raw = fs.readFileSync(ROULETTE_ITEMS_FILE, 'utf-8');
      if (raw.trim()) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          return items;
        }
      }
    }
  } catch (err) {
    console.error('Error reading items file:', err);
  }

  return [];
}

export function saveAllServerItems(items: RouletteItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(ROULETTE_ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing items file:', err);
  }
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
  ensureDataDir();
  try {
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const raw = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8');
      if (raw.trim()) {
        const data = JSON.parse(raw);
        if (data && typeof data.password === 'string' && data.password.trim()) {
          return data.password.trim();
        }
      }
    }
  } catch (err) {
    console.error('Error reading admin config file:', err);
  }
  return process.env.ADMIN_PASSWORD || 'admin1234';
}

export function saveMasterAdminPassword(newPassword: string): boolean {
  ensureDataDir();
  try {
    const payload = {
      password: newPassword,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing admin config file:', err);
  }

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
  } catch (err) {
    console.error('Error updating .env file:', err);
  }

  return true;
}
