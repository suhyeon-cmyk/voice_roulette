'use client';

import React, { useEffect, useState } from 'react';
import RouletteWheel from '@/components/RouletteWheel';
import ResultModal from '@/components/ResultModal';
import ItemListModal from '@/components/ItemListModal';
import { RouletteItem, RouletteState } from '@/types/roulette';
import { consumeSpin, DEFAULT_SAMPLE_ITEMS, DEFAULT_SAMPLE_ROOM, getRouletteRoom } from '@/lib/storage';
import { Heart, Sparkles, Clock, AlertCircle } from 'lucide-react';

const INITIAL_SAMPLE_STATE: RouletteState = {
  room: DEFAULT_SAMPLE_ROOM,
  items: DEFAULT_SAMPLE_ITEMS,
  remaining_spins: DEFAULT_SAMPLE_ROOM.daily_spins,
  is_valid_period: true,
};

export default function HomePage() {
  const [state, setState] = useState<RouletteState>(INITIAL_SAMPLE_STATE);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  // 기본 룰렛 로드
  const loadRoom = async () => {
    const lastRoomId = typeof window !== 'undefined' ? localStorage.getItem('vr_last_room_id') : null;
    let targetId = lastRoomId;

    if (!targetId) {
      try {
        const res = await fetch('/api/rooms', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.rooms?.length > 0) {
            targetId = data.rooms[0].id;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch rooms list:', err);
      }
    }

    try {
      let data = targetId ? await getRouletteRoom(targetId) : null;
      if (!data) {
        data = await getRouletteRoom(DEFAULT_SAMPLE_ROOM.id);
      }
      if (data) {
        setState(data);
      }
    } catch (err) {
      console.warn('Failed to load roulette room:', err);
    }
  };

  useEffect(() => {
    loadRoom();
  }, []);

  // 룰렛 스핀 종료 시
  const handleSpinEnd = async (winnerItem: RouletteItem) => {
    if (!state) return;

    // 스핀 횟수 1회 차감
    const nextRemaining = await consumeSpin(state.room.id);
    setState((prev) => ({ ...prev, remaining_spins: nextRemaining }));

    setWinner(winnerItem);
    setShowResultModal(true);
  };

  const room = state?.room || DEFAULT_SAMPLE_ROOM;
  const items = state?.items || [];
  const remaining = state?.remaining_spins ?? 0;
  const isValidPeriod = state?.is_valid_period ?? true;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-2 sm:py-6 overflow-x-hidden">
      {/* 중앙 메인 콘텐츠 영역 */}
      <main className="w-full max-w-[min(calc(100vw-32px),calc(100dvh-195px),480px)] flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 my-auto">
        {/* 룰렛 타이틀 배너 */}
        <div className="w-full pastel-card rounded-2xl sm:rounded-3xl px-3 py-2 sm:p-4 text-center flex flex-col items-center gap-0.5 sm:gap-1.5 shadow-sm">
          <div className="flex items-center gap-1 text-pink-500 text-[10px] sm:text-xs font-bold">
            <Heart className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 fill-current" />
            <span>두근두근</span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-gray-800 tracking-tight leading-snug">
            {room.title}
          </h2>

          {/* 남은 스핀 뱃지 */}
          <div className="mt-0.5 sm:mt-2 flex items-center justify-center">
            <div
              className={`px-3 sm:px-4 py-0.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-inner ${remaining > 0
                ? 'bg-pink-100 text-pink-700'
                : 'bg-gray-100 text-gray-500'
                }`}
            >
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>
                남은 스핀 : <strong className="text-xs sm:text-sm underline">{remaining}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 유효 기간 만료 경고 */}
        {!isValidPeriod && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>현재 설정된 룰렛 유효 기간이 아니에요.</span>
          </div>
        )}

        {/* 스핀 소진 알림 */}
        {remaining <= 0 && (
          <div className="w-full bg-pink-100/70 border border-pink-200 rounded-2xl p-3 text-pink-800 text-xs text-center leading-relaxed">
            💖 오늘의 스핀을 모두 사용했어요! <br />
            연인에게 <strong>보너스 스핀</strong>을 선물해달라고 졸라보세요 ✨
          </div>
        )}

        {/* 룰렛 캔버스 컴포넌트 */}
        <div className="w-full flex justify-center">
          <RouletteWheel
            items={items}
            onSpinEnd={handleSpinEnd}
            disabled={!isValidPeriod || remaining <= 0}
            remainingSpins={remaining}
            onWheelClick={() => setShowItemsModal(true)}
          />
        </div>
      </main>

      {/* 당첨 결과 모달 */}
      <ResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        winnerItem={winner}
        remainingSpins={remaining}
      />

      {/* 룰렛 전체 항목 다이얼로그 모달 */}
      <ItemListModal
        isOpen={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        roomTitle={room.title}
        items={items}
      />
    </div>
  );
}
