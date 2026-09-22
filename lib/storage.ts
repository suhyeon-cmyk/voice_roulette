import { RouletteItem, RouletteData, RouletteState } from '@/types/roulette';

const LOCAL_ROULETTES_KEY = 'vr_roulettes';
const LOCAL_ITEMS_KEY = 'vr_roulette_items';

// 모바일 비보안 HTTP IP 환경에서도 동작하는 안전한 UUID 생성기
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 파스텔 기본 팔레트
export const PASTEL_PALETTE = [
  '#FFB5C5', // 소프트 베이비 핑크
  '#FFDAC1', // 부드러운 살구 피치
  '#FFF2B2', // 따뜻한 버터 옐로우
  '#B5EAD7', // 산뜻한 파스텔 민트
  '#C7CEEA', // 몽환적인 라벤더 블루
  '#E2C6FF', // 달콤한 바이올렛
  '#FFC6FF', // 캔디 핑크
  '#BFFCC6', // 연두 크림
];

// ----------------------------------------------------------------------
// 1. 유효 기간 및 잔여 횟수 계산 유틸리티
// ----------------------------------------------------------------------
export function calculateRemainingSpins(roulette: RouletteData): {
  remaining: number;
  isValidPeriod: boolean;
  isDateReset: boolean;
} {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().getTime();

  let isValidPeriod = true;
  if (roulette.valid_from && new Date(roulette.valid_from).getTime() > now) {
    isValidPeriod = false;
  }
  if (roulette.valid_until && new Date(roulette.valid_until).getTime() < now) {
    isValidPeriod = false;
  }

  let used = roulette.used_spins || 0;
  let isDateReset = false;

  if (roulette.reset_mode === 'daily') {
    if (roulette.last_reset_date !== today) {
      used = 0;
      isDateReset = true;
    }
  }

  let base = 0;
  if (roulette.reset_mode === 'daily') {
    base = roulette.daily_spins ?? 3;
  } else if (roulette.reset_mode === 'total') {
    base = roulette.total_spins ?? 10;
  } else if (roulette.reset_mode === 'infinite') {
    return { remaining: 999, isValidPeriod, isDateReset };
  }

  const bonus = roulette.bonus_spins || 0;
  const remaining = Math.max(0, base + bonus - used);

  return { remaining, isValidPeriod, isDateReset };
}

// ----------------------------------------------------------------------
// 2. 브라우저 LocalStorage 헬퍼
// ----------------------------------------------------------------------
export function getLocalRoulettes(): RouletteData[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_ROULETTES_KEY);
    if (!data) return [];
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalRoulettes(roulettes: RouletteData[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_ROULETTES_KEY, JSON.stringify(roulettes));
}

export function getLocalItems(): RouletteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_ITEMS_KEY);
    if (!data) return [];
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveLocalItems(items: RouletteItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(items));
}

// ----------------------------------------------------------------------
// 3. 룰렛 및 아이템 조회 (Server API ➔ LocalStorage)
// ----------------------------------------------------------------------
export async function getRouletteData(rouletteId: string): Promise<RouletteState | null> {
  if (!rouletteId) return null;

  // 1) Next.js Server API 연동 시도
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/roulette/${rouletteId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const roulette = data.roulette as RouletteData;
        if (roulette) {
          const localRoulettes = getLocalRoulettes();
          const rIdx = localRoulettes.findIndex((r) => r.id === rouletteId);
          if (rIdx >= 0) {
            localRoulettes[rIdx] = roulette;
          } else {
            localRoulettes.unshift(roulette);
          }
          saveLocalRoulettes(localRoulettes);
          return {
            roulette,
            items: data.items || [],
            remaining_spins: data.remaining_spins,
            is_valid_period: data.is_valid_period,
          };
        }
      } else if (res.status === 404) {
        // 중요: 서버에서 404(삭제되었거나 존재하지 않음)를 반환한 경우,
        // 브라우저 LocalStorage에 남아있던 구버전 캐시도 완전히 파기하고 즉시 null을 반환합니다.
        const localRoulettes = getLocalRoulettes().filter((r) => r.id !== rouletteId);
        saveLocalRoulettes(localRoulettes);
        const localItems = getLocalItems().filter((it) => it.roulette_id !== rouletteId);
        saveLocalItems(localItems);
        try {
          if (localStorage.getItem('vr_last_roulette_id') === rouletteId) {
            localStorage.removeItem('vr_last_roulette_id');
          }
        } catch {}
        return null;
      }
    } catch (e) {
      console.warn('Server API fetch failed, trying local storage:', e);
    }
  }

  // 2) LocalStorage Fallback (서버 오프라인/네트워크 단절 시에만 한정)
  const roulettes = getLocalRoulettes();
  const roulette = roulettes.find((r) => r.id === rouletteId);
  if (roulette) {
    const allItems = getLocalItems();
    const items = allItems.filter((it) => it.roulette_id === rouletteId);

    const { remaining, isValidPeriod, isDateReset } = calculateRemainingSpins(roulette);
    if (isDateReset) {
      roulette.used_spins = 0;
      roulette.last_reset_date = new Date().toISOString().slice(0, 10);
      saveLocalRoulettes(roulettes);
    }

    return {
      roulette,
      items,
      remaining_spins: remaining,
      is_valid_period: isValidPeriod,
    };
  }

  return null;
}

// ----------------------------------------------------------------------
// 3-1. 룰렛 단건 삭제 (Server API + LocalStorage 동시 삭제)
// ----------------------------------------------------------------------
export async function deleteRouletteData(rouletteId: string): Promise<boolean> {
  if (!rouletteId) return false;

  // 1) Server API 삭제 요청
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/roulette/${rouletteId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Server API delete failed:', e);
    }
  }

  // 2) LocalStorage 캐시 완전 파기
  if (typeof window !== 'undefined') {
    const localRoulettes = getLocalRoulettes().filter((r) => r.id !== rouletteId);
    saveLocalRoulettes(localRoulettes);
    const localItems = getLocalItems().filter((it) => it.roulette_id !== rouletteId);
    saveLocalItems(localItems);
    try {
      if (localStorage.getItem('vr_last_roulette_id') === rouletteId) {
        localStorage.removeItem('vr_last_roulette_id');
      }
    } catch {}
  }

  return true;
}

// ----------------------------------------------------------------------
// 4. 룰렛 생성 및 수정 (Settings) - Server API 및 LocalStorage 저장
// ----------------------------------------------------------------------
export async function saveRouletteData(
  roulette: RouletteData,
  items: RouletteItem[]
): Promise<{ success: boolean; roulette: RouletteData; error?: string }> {
  const updatedRoulette = {
    ...roulette,
    updated_at: new Date().toISOString(),
  };

  // 1) Server API에 저장 (JSON 파일 기반 영구 저장)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roulette: updatedRoulette, items }),
      });
    } catch (e) {
      console.warn('Server API save failed:', e);
    }
  }

  // 2) LocalStorage에도 보존
  const roulettes = getLocalRoulettes();
  const rIdx = roulettes.findIndex((r) => r.id === updatedRoulette.id);
  if (rIdx >= 0) {
    roulettes[rIdx] = updatedRoulette;
  } else {
    roulettes.unshift(updatedRoulette);
  }
  saveLocalRoulettes(roulettes);

  const currentItems = getLocalItems().filter((it) => it.roulette_id !== updatedRoulette.id);
  const newItems = items.map((it, idx) => ({
    ...it,
    id: it.id || generateUUID(),
    roulette_id: updatedRoulette.id,
    sort_order: idx,
  }));
  saveLocalItems([...currentItems, ...newItems]);

  return { success: true, roulette: updatedRoulette };
}

// ----------------------------------------------------------------------
// 5. 스핀 소진 (차감)
// ----------------------------------------------------------------------
export async function consumeSpin(rouletteId: string): Promise<number> {
  // 1) Server API
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/roulette/${rouletteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'consume' }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.remaining_spins;
      }
    } catch (e) {
      console.warn('Server API consume failed:', e);
    }
  }

  // 2) LocalStorage
  const roulettes = getLocalRoulettes();
  const roulette = roulettes.find((r) => r.id === rouletteId);
  if (roulette) {
    roulette.used_spins = (roulette.used_spins || 0) + 1;
    roulette.last_reset_date = new Date().toISOString().slice(0, 10);
    saveLocalRoulettes(roulettes);
    const { remaining } = calculateRemainingSpins(roulette);
    return remaining;
  }
  return 0;
}

// ----------------------------------------------------------------------
// 6. 보너스 기회 부여 및 수동 차감
// ----------------------------------------------------------------------
export async function adjustBonusSpins(rouletteId: string, delta: number): Promise<RouletteData | null> {
  // 1) Server API
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/roulette/${rouletteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust_bonus', delta }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.roulette;
      }
    } catch (e) {
      console.warn('Server API adjust bonus failed:', e);
    }
  }

  // 2) LocalStorage
  const roulettes = getLocalRoulettes();
  const roulette = roulettes.find((r) => r.id === rouletteId);
  if (roulette) {
    roulette.bonus_spins = (roulette.bonus_spins || 0) + delta;
    roulette.updated_at = new Date().toISOString();
    saveLocalRoulettes(roulettes);
    return roulette;
  }
  return null;
}

// ----------------------------------------------------------------------
// 7. 오디오 녹음 파일 Server API 업로드
// ----------------------------------------------------------------------
export async function uploadAudioFile(
  file: Blob | File,
  rouletteId: string,
  itemId: string
): Promise<{ url: string }> {
  // 1) Server API 업로드 (서버 로컬 public/uploads/ 저장)
  if (typeof window !== 'undefined') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('rouletteId', rouletteId);
      formData.append('itemId', itemId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return { url: data.url };
        }
      }
    } catch (err) {
      console.warn('Server upload failed, falling back to base64 data URL:', err);
    }
  }

  // 2) Base64 Data URL Fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ----------------------------------------------------------------------
// 8. 이미지 메시지 파일 Server API 업로드 (image-messages 버킷)
// ----------------------------------------------------------------------
export async function uploadImageFile(
  file: Blob | File,
  rouletteId: string,
  itemId: string
): Promise<{ url: string }> {
  // 1) Server API 업로드
  if (typeof window !== 'undefined') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      formData.append('rouletteId', rouletteId);
      formData.append('itemId', itemId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          return { url: data.url };
        }
      }
    } catch (err) {
      console.warn('Server image upload failed, falling back to base64 data URL:', err);
    }
  }

  // 2) Base64 Data URL Fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({ url: reader.result as string });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

