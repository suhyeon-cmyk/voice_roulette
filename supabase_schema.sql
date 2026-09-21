-- ==============================================================================
-- Voice Roulette (음성 룰렛) Supabase 스키마 정의 및 초기화 스크립트
-- ==============================================================================

-- 1. Roulettes (룰렛 기본 메타데이터) 테이블
CREATE TABLE IF NOT EXISTS public.roulettes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reset_mode TEXT NOT NULL DEFAULT 'daily',
  daily_spins INTEGER NOT NULL DEFAULT 3,
  total_spins INTEGER NOT NULL DEFAULT 10,
  bonus_spins INTEGER NOT NULL DEFAULT 0,
  used_spins INTEGER NOT NULL DEFAULT 0,
  last_reset_date TEXT NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  edit_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Roulette Items (룰렛 항목 및 음성 정보) 테이블
CREATE TABLE IF NOT EXISTS public.roulette_items (
  id TEXT PRIMARY KEY,
  roulette_id TEXT NOT NULL REFERENCES public.roulettes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  probability NUMERIC NOT NULL DEFAULT 0,
  audio_url TEXT,
  audio_name TEXT,
  audio_duration NUMERIC,
  color TEXT NOT NULL DEFAULT '#FFB5C5',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (룰렛 ID 기반 항목 고속 조회)
CREATE INDEX IF NOT EXISTS idx_roulette_items_roulette_id ON public.roulette_items(roulette_id);
CREATE INDEX IF NOT EXISTS idx_roulette_items_sort_order ON public.roulette_items(roulette_id, sort_order);

-- 3. Admin Settings (마스터 관리자 설정값) 테이블
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Supabase Storage Bucket ('voice-messages') 생성 및 Public 정책 설정
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage 버킷 RLS 정책 설정 (공개 읽기 및 누구나 업로드/갱신 가능)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Voice Messages Public Select'
  ) THEN
    CREATE POLICY "Voice Messages Public Select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'voice-messages');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Voice Messages Public Insert'
  ) THEN
    CREATE POLICY "Voice Messages Public Insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'voice-messages');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Voice Messages Public Update'
  ) THEN
    CREATE POLICY "Voice Messages Public Update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'voice-messages');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Voice Messages Public Delete'
  ) THEN
    CREATE POLICY "Voice Messages Public Delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'voice-messages');
  END IF;
END $$;
