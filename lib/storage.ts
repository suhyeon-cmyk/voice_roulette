import { RouletteItem, RouletteRoom, RouletteState } from '@/types/roulette';

const LOCAL_ROOMS_KEY = 'vr_roulette_rooms';
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

// 기본 샘플 커플 룰렛 데이터
export const DEFAULT_SAMPLE_ROOM: RouletteRoom = {
  id: 'sample-love-roulette',
  title: '우리의 달콤한 커플 룰렛 💕',
  reset_mode: 'daily',
  daily_spins: 3,
  total_spins: 10,
  bonus_spins: 0,
  used_spins: 0,
  last_reset_date: new Date().toISOString().slice(0, 10),
  edit_key: process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234',
  created_at: new Date().toISOString(),
};

export const DEFAULT_SAMPLE_ITEMS: RouletteItem[] = [
  {
    id: 'sample-item-1',
    roulette_id: 'sample-love-roulette',
    title: '',
    probability: 30,
    color: '#FFB5C5',
    sort_order: 0,
  },
];

// ----------------------------------------------------------------------
// 1. 유효 기간 및 잔여 횟수 계산 유틸리티
// ----------------------------------------------------------------------
export function calculateRemainingSpins(room: RouletteRoom): {
  remaining: number;
  isValidPeriod: boolean;
  isDateReset: boolean;
} {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().getTime();

  let isValidPeriod = true;
  if (room.valid_from && new Date(room.valid_from).getTime() > now) {
    isValidPeriod = false;
  }
  if (room.valid_until && new Date(room.valid_until).getTime() < now) {
    isValidPeriod = false;
  }

  let used = room.used_spins || 0;
  let isDateReset = false;

  if (room.reset_mode === 'daily') {
    if (room.last_reset_date !== today) {
      used = 0;
      isDateReset = true;
    }
  }

  let base = 0;
  if (room.reset_mode === 'daily') {
    base = room.daily_spins ?? 3;
  } else if (room.reset_mode === 'total') {
    base = room.total_spins ?? 10;
  } else if (room.reset_mode === 'infinite') {
    return { remaining: 999, isValidPeriod, isDateReset };
  }

  const bonus = room.bonus_spins || 0;
  const remaining = Math.max(0, base + bonus - used);

  return { remaining, isValidPeriod, isDateReset };
}

// ----------------------------------------------------------------------
// 2. 브라우저 LocalStorage 헬퍼
// ----------------------------------------------------------------------
export function getLocalRooms(): RouletteRoom[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_ROOMS_KEY);
    if (!data) return [];
    const rooms = JSON.parse(data);
    return Array.isArray(rooms) ? rooms : [];
  } catch {
    return [];
  }
}

export function saveLocalRooms(rooms: RouletteRoom[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
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
// 3. 룸 및 아이템 조회 (Server API ➔ LocalStorage)
// ----------------------------------------------------------------------
export async function getRouletteRoom(roomId: string): Promise<RouletteState | null> {
  // 1) Next.js Server API 연동 시도 (다른 브라우저, 기기, 시크릿창 공유 지원)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.room) {
          return data as RouletteState;
        }
      } else if (res.status === 404) {
        // 서버에서 404 (삭제되었거나 존재하지 않는 룰렛)인 경우:
        // 로컬스토리지의 캐시도 정리하고 즉시 null 반환
        const rooms = getLocalRooms().filter((r) => r.id !== roomId);
        saveLocalRooms(rooms);
        const items = getLocalItems().filter((it) => (it.roulette_id || it.room_id) !== roomId);
        saveLocalItems(items);
        if (localStorage.getItem('vr_last_room_id') === roomId) {
          localStorage.removeItem('vr_last_room_id');
        }
        return null;
      }
    } catch (e) {
      console.warn('Server API fetch failed, trying local storage:', e);
    }
  }

  // 2) LocalStorage Fallback
  const rooms = getLocalRooms();
  const room = rooms.find((r) => r.id === roomId);
  if (!room) {
    if (roomId === DEFAULT_SAMPLE_ROOM.id) {
      return {
        room: DEFAULT_SAMPLE_ROOM,
        items: DEFAULT_SAMPLE_ITEMS,
        remaining_spins: DEFAULT_SAMPLE_ROOM.daily_spins,
        is_valid_period: true,
      };
    }
    return null;
  }

  const allItems = getLocalItems();
  let items = allItems.filter((it) => (it.roulette_id || it.room_id) === roomId);
  if (items.length === 0 && roomId === DEFAULT_SAMPLE_ROOM.id) {
    items = DEFAULT_SAMPLE_ITEMS;
  }

  const { remaining, isValidPeriod, isDateReset } = calculateRemainingSpins(room);
  if (isDateReset) {
    room.used_spins = 0;
    room.last_reset_date = new Date().toISOString().slice(0, 10);
    saveLocalRooms(rooms);
  }

  return {
    room,
    items,
    remaining_spins: remaining,
    is_valid_period: isValidPeriod,
  };
}

// ----------------------------------------------------------------------
// 4. 룸 생성 및 수정 (Settings) - Server API 및 LocalStorage 저장
// ----------------------------------------------------------------------
export async function saveRouletteRoom(
  room: RouletteRoom,
  items: RouletteItem[]
): Promise<{ success: boolean; room: RouletteRoom; error?: string }> {
  const updatedRoom = {
    ...room,
    updated_at: new Date().toISOString(),
  };

  // 1) Server API에 저장 (JSON 파일 기반 영구 저장)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: updatedRoom, items }),
      });
    } catch (e) {
      console.warn('Server API save failed:', e);
    }
  }

  // 2) LocalStorage에도 보존
  const rooms = getLocalRooms();
  const roomIdx = rooms.findIndex((r) => r.id === updatedRoom.id);
  if (roomIdx >= 0) {
    rooms[roomIdx] = updatedRoom;
  } else {
    rooms.unshift(updatedRoom);
  }
  saveLocalRooms(rooms);

  const currentItems = getLocalItems().filter((it) => (it.roulette_id || it.room_id) !== updatedRoom.id);
  const newItems = items.map((it, idx) => ({
    ...it,
    id: it.id || generateUUID(),
    roulette_id: updatedRoom.id,
    sort_order: idx,
  }));
  saveLocalItems([...currentItems, ...newItems]);

  return { success: true, room: updatedRoom };
}

// ----------------------------------------------------------------------
// 5. 스핀 소진 (차감)
// ----------------------------------------------------------------------
export async function consumeSpin(roomId: string): Promise<number> {
  // 1) Server API
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
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
  const rooms = getLocalRooms();
  const room = rooms.find((r) => r.id === roomId);
  if (room) {
    room.used_spins = (room.used_spins || 0) + 1;
    room.last_reset_date = new Date().toISOString().slice(0, 10);
    saveLocalRooms(rooms);
    const { remaining } = calculateRemainingSpins(room);
    return remaining;
  }
  return 0;
}

// ----------------------------------------------------------------------
// 6. 보너스 기회 부여 및 수동 차감 (Settings에서 관리)
// ----------------------------------------------------------------------
export async function adjustBonusSpins(roomId: string, delta: number): Promise<RouletteRoom | null> {
  // 1) Server API
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust_bonus', delta }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.room;
      }
    } catch (e) {
      console.warn('Server API adjust bonus failed:', e);
    }
  }

  // 2) LocalStorage
  const rooms = getLocalRooms();
  const room = rooms.find((r) => r.id === roomId);
  if (room) {
    room.bonus_spins = (room.bonus_spins || 0) + delta;
    room.updated_at = new Date().toISOString();
    saveLocalRooms(rooms);
    return room;
  }
  return null;
}

// ----------------------------------------------------------------------
// 7. 오디오 녹음 파일 Server API 업로드
// ----------------------------------------------------------------------
export async function uploadAudioFile(
  file: Blob | File,
  roomId: string,
  itemId: string
): Promise<{ url: string }> {
  // 1) Server API 업로드 (서버 로컬 public/uploads/ 저장)
  if (typeof window !== 'undefined') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
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
