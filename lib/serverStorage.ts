import fs from 'fs';
import path from 'path';
import { RouletteItem, RouletteData } from '@/types/roulette';
import { getSupabaseAdmin } from './supabase';
import defaultSuggestionsData from '@/data/suggestions.json';

export interface AdminRouletteStats {
  roulette: RouletteData;
  items: RouletteItem[];
  itemCount: number;
  audioCount: number;
  imageCount?: number;
  textCount?: number;
  totalProbability: number;
}

interface ItemMetaJson {
  vr_meta: 1;
  an?: string | null;
  img?: string | null;
  in?: string | null;
  txt?: string | null;
}

/**
 * DB에 image_url, text_message 컬럼이 아직 없을 때 audio_name에 JSON으로 메타데이터를 보존합니다.
 */
function encodeItemMetadata(it: {
  audio_name?: string | null;
  image_url?: string | null;
  image_name?: string | null;
  text_message?: string | null;
}): string | null {
  const hasExtra = it.image_url || it.image_name || it.text_message;
  if (!hasExtra) {
    return it.audio_name || null;
  }
  const meta: ItemMetaJson = {
    vr_meta: 1,
    an: it.audio_name || null,
    img: it.image_url || null,
    in: it.image_name || null,
    txt: it.text_message || null,
  };
  return JSON.stringify(meta);
}

/**
 * audio_name에 인코딩된 메타데이터가 있으면 image_url, text_message, image_name으로 복원합니다.
 */
function decodeItemMetadata(it: RouletteItem): RouletteItem {
  if (it.image_url || it.text_message) {
    return it;
  }
  if (it.audio_name && typeof it.audio_name === 'string' && it.audio_name.startsWith('{"vr_meta":1')) {
    try {
      const meta = JSON.parse(it.audio_name) as ItemMetaJson;
      return {
        ...it,
        audio_name: meta.an || undefined,
        image_url: meta.img || undefined,
        image_name: meta.in || undefined,
        text_message: meta.txt || undefined,
      };
    } catch {
      return it;
    }
  }
  return it;
}

/**
 * Supabase DB에서 모든 룰렛 목록을 최신순으로 가져옵니다.
 */
export async function getAllServerRoulettes(): Promise<RouletteData[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('Supabase client is not configured.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('roulettes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching roulettes from Supabase:', error);
      return [];
    }

    return (data || []) as RouletteData[];
  } catch (err) {
    console.error('Exception fetching roulettes from Supabase:', err);
    return [];
  }
}

/**
 * Supabase DB에서 모든 룰렛 아이템 목록을 가져옵니다.
 */
export async function getAllServerItems(): Promise<RouletteItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('roulette_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching roulette items from Supabase:', error);
      return [];
    }

    return ((data || []) as RouletteItem[]).map(decodeItemMetadata);
  } catch (err) {
    console.error('Exception fetching roulette items from Supabase:', err);
    return [];
  }
}

/**
 * 특정 룰렛 ID의 데이터 및 소속 아이템 목록을 조회합니다.
 */
export async function getServerRouletteData(
  rouletteId: string
): Promise<{ roulette: RouletteData; items: RouletteItem[] } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data: roulette, error: rError } = await supabase
      .from('roulettes')
      .select('*')
      .eq('id', rouletteId)
      .maybeSingle();

    if (rError || !roulette) {
      if (rError) console.error('Error fetching single roulette:', rError);
      return null;
    }

    const { data: items, error: iError } = await supabase
      .from('roulette_items')
      .select('*')
      .eq('roulette_id', rouletteId)
      .order('sort_order', { ascending: true });

    if (iError) {
      console.error('Error fetching items for roulette:', iError);
    }

    return {
      roulette: roulette as RouletteData,
      items: ((items || []) as RouletteItem[]).map(decodeItemMetadata),
    };
  } catch (err) {
    console.error('Exception fetching roulette data:', err);
    return null;
  }
}

/**
 * 룰렛 정보 및 아이템 목록을 Supabase DB에 저장(Upsert)합니다.
 */
export async function upsertServerRoulette(
  roulette: RouletteData,
  items: RouletteItem[]
): Promise<{ roulette: RouletteData; items: RouletteItem[] } | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error('Supabase configuration missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }

  const now = new Date().toISOString();
  const roulettePayload = {
    id: roulette.id,
    title: roulette.title,
    reset_mode: roulette.reset_mode || 'daily',
    daily_spins: roulette.daily_spins ?? 3,
    total_spins: roulette.total_spins ?? 10,
    bonus_spins: roulette.bonus_spins ?? 0,
    used_spins: roulette.used_spins ?? 0,
    last_reset_date: roulette.last_reset_date || now.slice(0, 10),
    valid_from: roulette.valid_from || null,
    valid_until: roulette.valid_until || null,
    edit_key: roulette.edit_key,
    created_at: roulette.created_at || now,
    updated_at: now,
  };

  // 1) 룰렛 메타데이터 Upsert
  const { data: savedRoulette, error: rError } = await supabase
    .from('roulettes')
    .upsert(roulettePayload)
    .select()
    .single();

  if (rError || !savedRoulette) {
    console.error('Error upserting roulette:', rError);
    throw new Error(rError?.message || 'Failed to save roulette');
  }

  // 2) 기존 소속 아이템 삭제 후 새 아이템 일괄 등록
  const { error: delError } = await supabase
    .from('roulette_items')
    .delete()
    .eq('roulette_id', roulette.id);

  if (delError) {
    console.error('Error clearing old roulette items:', delError);
  }

  const formattedItems = (items || []).map((it, idx) => ({
    id: it.id || crypto.randomUUID(),
    roulette_id: roulette.id,
    title: it.title,
    probability: Number(it.probability) || 0,
    text_message: it.text_message ? it.text_message.trim() : null,
    image_url: it.image_url || null,
    image_name: it.image_name || null,
    audio_url: it.audio_url || null,
    audio_name: it.audio_name || null,
    audio_duration: it.audio_duration ? Number(it.audio_duration) : null,
    color: it.color || '#FFB5C5',
    sort_order: idx,
    created_at: it.created_at || now,
  }));

  let savedItems: RouletteItem[] = [];
  if (formattedItems.length > 0) {
    const { data: insertedItems, error: iError } = await supabase
      .from('roulette_items')
      .insert(formattedItems)
      .select()
      .order('sort_order', { ascending: true });

    if (iError) {
      console.warn('First insert attempt failed, trying fallback insert without new columns:', iError.message);
      // DB에 새 컬럼이 아직 없는 경우를 위한 안전 Fallback
      const baseItems = formattedItems.map((it) => ({
        id: it.id,
        roulette_id: it.roulette_id,
        title: it.title,
        probability: it.probability,
        audio_url: it.audio_url,
        audio_name: encodeItemMetadata(it),
        audio_duration: it.audio_duration,
        color: it.color,
        sort_order: it.sort_order,
        created_at: it.created_at,
      }));

      const { data: fallbackItems, error: fbError } = await supabase
        .from('roulette_items')
        .insert(baseItems)
        .select()
        .order('sort_order', { ascending: true });

      if (fbError) {
        console.error('Fallback inserting roulette items failed:', fbError);
        throw new Error(fbError.message || 'Failed to save roulette items');
      }

      savedItems = (fallbackItems || []).map((fb, idx) => ({
        ...fb,
        text_message: formattedItems[idx]?.text_message || undefined,
        image_url: formattedItems[idx]?.image_url || undefined,
        image_name: formattedItems[idx]?.image_name || undefined,
      })) as RouletteItem[];
    } else {
      savedItems = (insertedItems || []) as RouletteItem[];
    }
  }

  return {
    roulette: savedRoulette as RouletteData,
    items: savedItems,
  };
}

/**
 * 룰렛 스핀 수치 또는 리셋 일자를 업데이트합니다.
 */
export async function updateRouletteSpins(
  rouletteId: string,
  updates: Partial<Pick<RouletteData, 'used_spins' | 'bonus_spins' | 'last_reset_date' | 'updated_at'>>
): Promise<RouletteData | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('roulettes')
      .update(payload)
      .eq('id', rouletteId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating roulette spins:', error);
      return null;
    }

    return data as RouletteData;
  } catch (err) {
    console.error('Exception updating roulette spins:', err);
    return null;
  }
}

/**
 * 룰렛을 Supabase DB에서 삭제합니다 (소속 아이템 CASCADE 삭제).
 */
export async function deleteServerRoulette(rouletteId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('roulettes')
      .delete()
      .eq('id', rouletteId.trim());

    if (error) {
      console.error('Error deleting roulette from Supabase:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception deleting roulette from Supabase:', err);
    return false;
  }
}

/**
 * 관리자 대시보드 통계 및 룰렛 목록을 가져옵니다.
 */
export async function getAllServerRoulettesWithStats(): Promise<AdminRouletteStats[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data: roulettes, error: rError } = await supabase
      .from('roulettes')
      .select('*')
      .order('created_at', { ascending: false });

    if (rError || !roulettes) {
      console.error('Error fetching roulettes for stats:', rError);
      return [];
    }

    const { data: allItems, error: iError } = await supabase
      .from('roulette_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (iError) {
      console.error('Error fetching roulette items for stats:', iError);
    }

    const itemsList = ((allItems || []) as RouletteItem[]).map(decodeItemMetadata);

    return (roulettes as RouletteData[]).map((roulette) => {
      const items = itemsList.filter((it) => it.roulette_id === roulette.id);
      const audioCount = items.filter((it) => Boolean(it.audio_url)).length;
      const imageCount = items.filter((it) => Boolean(it.image_url)).length;
      const textCount = items.filter((it) => Boolean(it.text_message?.trim())).length;
      const totalProbability = items.reduce((acc, it) => acc + (Number(it.probability) || 0), 0);
      return {
        roulette,
        items,
        itemCount: items.length,
        audioCount,
        imageCount,
        textCount,
        totalProbability,
      };
    });
  } catch (err) {
    console.error('Exception calculating admin roulette stats:', err);
    return [];
  }
}

/**
 * 마스터 관리자 비밀번호를 조회합니다 (DB admin_settings 우선, 환경변수 fallback).
 */
export async function getMasterAdminPassword(): Promise<string> {
  const defaultPass = process.env.ADMIN_PASSWORD || 'admin1234';
  const supabase = getSupabaseAdmin();
  if (!supabase) return defaultPass;

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'master_password')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'string' && data.value.trim()) {
      return data.value.trim();
    }
  } catch (err) {
    console.error('Error reading admin password from Supabase:', err);
  }

  return defaultPass;
}

/**
 * 마스터 관리자 비밀번호를 Supabase admin_settings 테이블에 저장합니다.
 */
export async function saveMasterAdminPassword(newPassword: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'master_password',
          value: newPassword,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving admin password to Supabase:', error);
      }
    } catch (err) {
      console.error('Exception saving admin password to Supabase:', err);
    }
  }

  // 로컬 개발 환경인 경우 .env 파일에도 동기화 시도
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
  } catch {
    // 환경변수 파일 쓰기 실패 무시
  }

  return true;
}

/**
 * 추천 문구 프리셋을 반환합니다 (suggestions.json 사용).
 */
export function getPresetRecommendations(): string[] {
  return Array.isArray(defaultSuggestionsData) ? (defaultSuggestionsData as string[]) : [];
}
