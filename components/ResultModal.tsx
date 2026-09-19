'use client';

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { RouletteItem } from '@/types/roulette';
import { Sparkles, Play, Volume2, X, RotateCcw, AlertCircle, Settings } from 'lucide-react';
import Link from 'next/link';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  winnerItem: RouletteItem | null;
  remainingSpins: number;
  isTestMode?: boolean;
  rouletteId?: string;
  editKey?: string;
}

export default function ResultModal({
  isOpen,
  onClose,
  winnerItem,
  remainingSpins,
  isTestMode = false,
  rouletteId,
  editKey,
}: ResultModalProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const targetRouletteId = rouletteId;

  useEffect(() => {
    if (!isOpen || !winnerItem) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingAudio(false);
      return;
    }

    // 새로운 당첨 모달이 열릴 때마다 상태 초기화 (기본 정지 상태)
    setHasListened(false);
    setIsPlayingAudio(false);
    setAudioError(false);

    // 축하 Confetti 폭죽 효과
    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF8FA3', '#FFCCD5', '#B5EAD7', '#FFDAC1', '#FFF2B2', '#C7CEEA'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FF8FA3', '#FFB5C5'],
        });
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#B5EAD7', '#C7CEEA'],
        });
      }, 250);
    } catch {
      // confetti 오류 무시
    }
  }, [isOpen, winnerItem]);

  if (!isOpen || !winnerItem) return null;

  // 음성 재생 시작 (재생 중에는 멈출 수 없음)
  const playAudio = () => {
    if (!audioRef.current || hasListened || isPlayingAudio) return;
    setAudioError(false);
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => {
        setIsPlayingAudio(true);
      })
      .catch((err) => {
        console.warn('Audio play failed:', err);
        setAudioError(true);
        setIsPlayingAudio(false);
      });
  };

  // 음성 메시지가 필수인 경우 (음성이 있고, 아직 안 들었고, 오류도 안 난 경우) 모달 닫기 불가
  const canClose = !winnerItem.audio_url || hasListened || audioError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center gap-4 animate-scale-up"
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #fff0f5 100%)',
          border: '3px solid #ffccd5',
        }}
      >
        {/* 닫기 버튼: 음성 메시지가 있는 경우 무조건 다 들어야 닫을 수 있음 */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-pink-400 hover:text-pink-600 hover:bg-pink-100 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* 상단 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-pink-100 text-pink-600 text-xs font-bold shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>두근두근 룰렛 결과 발표! 🎲</span>
        </div>

        {/* 메인 당첨 아이템 카드 */}
        <div
          className="w-full py-6 px-4 rounded-2xl border-2 border-white shadow-md flex flex-col items-center gap-2"
          style={{ backgroundColor: winnerItem.color || '#FFE4EC' }}
        >
          <span className="text-3xl">🎉</span>
          <h3 className="text-xl font-extrabold text-gray-800 tracking-tight break-keep">
            {winnerItem.title}
          </h3>
          <span className="text-xs text-gray-600/80 font-medium">
            확률 {winnerItem.probability}% 🎯
          </span>
        </div>

        {/* 숨김 오디오 엘리먼트 */}
        {winnerItem.audio_url && (
          <audio
            ref={audioRef}
            src={winnerItem.audio_url}
            onEnded={() => {
              setIsPlayingAudio(false);
              setHasListened(true);
            }}
            onError={() => {
              setIsPlayingAudio(false);
              setAudioError(true);
            }}
          />
        )}

        {/* 통합 액션 버튼 */}
        <div className="w-full mt-2">
          {/* 오류 발생 시 */}
          {audioError ? (
            <div className="w-full flex flex-col gap-2.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-50 py-2.5 px-3 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>음성을 재생할 수 없습니다.</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isTestMode ? '다시 테스트하기 (스핀 소모 없음)' : remainingSpins >= 900 ? '다시 돌리기 (무제한 ∞)' : `다시 돌리기 (남은 스핀 ${remainingSpins}회)`}</span>
              </button>
            </div>
          ) : winnerItem.audio_url && !hasListened ? (
            isPlayingAudio ? (
              /* 2. 음성 메시지 재생 중... (중간에 멈출 수 없음) */
              <div className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 select-none animate-pulse">
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span>음성 메시지 재생 중... 🎧</span>
              </div>
            ) : (
              /* 1. 음성 메시지 듣기 (음성 메시지가 있는 경우 무조건 먼저 들어야 함) */
              <button
                type="button"
                onClick={playAudio}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer animate-pulse-glow"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>음성 메시지 듣기</span>
              </button>
            )
          ) : (
            /* 3. 음성 재생 완료 후 또는 4. 음성 메시지가 없는 경우: 다시 돌리기 */
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isTestMode ? '다시 테스트하기 (스핀 소모 없음)' : remainingSpins >= 900 ? '다시 돌리기 (무제한 ∞)' : `다시 돌리기 (남은 스핀 ${remainingSpins}회)`}</span>
              </button>

              {/* 테스트 모드일 때 설정으로 돌아가기 버튼 제공 (비밀번호 자동 인증 키 전달) */}
              {isTestMode && targetRouletteId && (
                <Link
                  href={`/settings/${targetRouletteId}${editKey ? `?key=${editKey}` : ''}`}
                  className="w-full py-2.5 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>설정 화면으로 돌아가기</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
