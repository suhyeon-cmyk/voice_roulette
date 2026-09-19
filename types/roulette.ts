export type ResetMode = 'daily' | 'total' | 'infinite';

export interface RouletteRoom {
  id: string;
  title: string;
  reset_mode: ResetMode;
  daily_spins: number;      // 일일 기본 스핀 수 (reset_mode === 'daily')
  total_spins: number;      // 총 기본 스핀 수 (reset_mode === 'total')
  bonus_spins: number;      // 관리자가 부여한 추가 보너스 횟수 (음수면 차감)
  used_spins: number;       // 현재 사용한 스핀 수
  last_reset_date: string;  // YYYY-MM-DD
  valid_from?: string;      // 유효 시작일시 (ISO string)
  valid_until?: string;     // 유효 종료일시 (ISO string)
  edit_key: string;         // 세팅 관리자 접근 키
  created_at: string;
  updated_at?: string;
}

export interface RouletteItem {
  id: string;
  roulette_id: string;
  room_id?: string;
  title: string;
  probability: number;      // 백분율 (0 ~ 100)
  audio_url?: string;       // 오디오 파일 URL 또는 Blob Data URL
  audio_name?: string;      // 파일 이름 또는 녹음 시간
  audio_duration?: number;  // 음성 길이 (초)
  color: string;            // 파스텔 HEX 컬러 (#FFB5C5 등)
  sort_order: number;
  created_at?: string;
}

export interface RouletteState {
  room: RouletteRoom;
  items: RouletteItem[];
  remaining_spins: number;
  is_valid_period: boolean;
}
