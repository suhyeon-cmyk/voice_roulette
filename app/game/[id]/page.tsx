'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import RouletteWheel from '@/components/RouletteWheel';
import ResultModal from '@/components/ResultModal';
import ItemListModal from '@/components/ItemListModal';
import { RouletteItem, RouletteState } from '@/types/roulette';
import { consumeSpin, getRouletteRoom, DEFAULT_SAMPLE_ROOM, DEFAULT_SAMPLE_ITEMS } from '@/lib/storage';
import { Heart, Sparkles, Clock, AlertCircle, FlaskConical, Settings } from 'lucide-react';
import Link from 'next/link';

function GamePlayRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.id as string;
  const isTestMode = searchParams.get('mode') === 'test';

  const [state, setState] = useState<RouletteState | null>(() => {
    if (roomId === DEFAULT_SAMPLE_ROOM.id) {
      return {
        room: DEFAULT_SAMPLE_ROOM,
        items: DEFAULT_SAMPLE_ITEMS,
        remaining_spins: DEFAULT_SAMPLE_ROOM.daily_spins,
        is_valid_period: true,
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(roomId !== DEFAULT_SAMPLE_ROOM.id);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('vr_last_room_id', roomId);
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getRouletteRoom(roomId);
        setState(data);
      } catch (err) {
        console.warn('Failed to load room:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [roomId]);

  const handleSpinEnd = async (winnerItem: RouletteItem) => {
    if (!state) return;

    if (!isTestMode) {
      // 일반 플레이 시에만 1회 차감 (테스트 모드에서는 스핀 소모 없음)
      const nextRemaining = await consumeSpin(state.room.id);
      setState((prev) => (prev ? { ...prev, remaining_spins: nextRemaining } : null));
    }

    setWinner(winnerItem);
    setShowResultModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-pink-400">
        <Sparkles className="w-10 h-10 animate-spin mb-3" />
        <p className="font-bold text-sm">연인의 룰렛을 불러오는 중...</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200/70 text-rose-500 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-1.5 tracking-tight">
          룰렛 정보를 찾을 수 없습니다.
        </h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-xs">
          삭제되었거나 존재하지 않는 룰렛입니다.<br />공유 링크를 다시 확인해주세요.
        </p>
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-colors shadow-xs"
          >
            홈으로 이동
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            새 룰렛 만들기
          </Link>
        </div>
      </div>
    );
  }

  const { room, items, remaining_spins: remaining, is_valid_period: isValidPeriod } = state;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-2 sm:py-6 overflow-x-hidden">
      {/* 테스트 모드 상단 배너 및 설정으로 돌아가기 버튼 */}
      {isTestMode && (
        <div className="w-full max-w-[min(calc(100vw-32px),calc(100dvh-195px),480px)] mb-2 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white rounded-2xl shadow-md flex items-center justify-between gap-2 text-xs animate-fade-in border border-white/20">
          <div className="flex items-center gap-1.5 font-black">
            <FlaskConical className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>테스트 모드 (스핀 소모 없음)</span>
          </div>
          <Link
            href={`/settings/${roomId}?key=${room.edit_key || searchParams.get('key') || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}`}
            className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Settings className="w-3 h-3" />
            <span>설정으로 돌아가기</span>
          </Link>
        </div>
      )}

      {/* 중앙 메인 콘텐츠 영역 */}
      <main className="w-full max-w-[min(calc(100vw-32px),calc(100dvh-195px),480px)] flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 my-auto">
        {/* 룰렛 타이틀 */}
        <div className="w-full pastel-card rounded-2xl sm:rounded-3xl px-3 py-2 sm:p-4 text-center flex flex-col items-center gap-0.5 sm:gap-1.5 shadow-sm">
          <h2 className="text-base sm:text-xl font-black text-gray-800 tracking-tight leading-snug">
            {room.title}
          </h2>

          {/* 남은 스핀 뱃지 / 테스트 모드 뱃지 */}
          {isTestMode ? (
            <div className="mt-0.5 sm:mt-2 flex items-center justify-center">
              <div className="px-3 sm:px-4 py-0.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black bg-purple-100 text-purple-700 flex items-center gap-1.5 shadow-inner">
                <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-purple-500" />
                <span>테스트 플레이 중 ✨ (무제한 스핀)</span>
              </div>
            </div>
          ) : (
            <div className="mt-0.5 sm:mt-2 flex items-center justify-center">
              <div
                className={`px-3 sm:px-4 py-0.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-inner ${
                  remaining > 0
                    ? 'bg-pink-100 text-pink-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>
                  남은 스핀 :{' '}
                  <strong className="text-xs sm:text-sm underline">
                    {room.reset_mode === 'infinite' ? '무제한 ∞' : `${remaining}회`}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 유효 기간 만료 경고 */}
        {!isValidPeriod && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-3 text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>현재 설정된 룰렛 유효 기간이 아니에요.</span>
          </div>
        )}

        {/* 스핀 소진 알림 (일반 모드이면서 무제한이 아닐 때만 표시) */}
        {!isTestMode && room.reset_mode !== 'infinite' && remaining <= 0 && (
          <div className="w-full bg-pink-100/70 border border-pink-200 rounded-2xl p-3 text-pink-800 text-xs text-center leading-relaxed">
            💖 오늘의 스핀을 모두 사용했어요!
          </div>
        )}

        {/* 룰렛 휠 (테스트 모드 또는 무제한 모드에서는 스핀 소진 제한 없이 가능) */}
        <div className="w-full flex justify-center">
          <RouletteWheel
            items={items}
            onSpinEnd={handleSpinEnd}
            disabled={!isValidPeriod || (!isTestMode && room.reset_mode !== 'infinite' && remaining <= 0)}
            remainingSpins={isTestMode || room.reset_mode === 'infinite' ? 999 : remaining}
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
        isTestMode={isTestMode}
        roomId={roomId}
        editKey={room.edit_key || searchParams.get('key') || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}
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

export default function GamePlayRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-pink-400">
          <Sparkles className="w-10 h-10 animate-spin mb-3" />
          <p className="font-bold text-sm">연인의 룰렛을 불러오는 중...</p>
        </div>
      }
    >
      <GamePlayRoomContent />
    </Suspense>
  );
}
