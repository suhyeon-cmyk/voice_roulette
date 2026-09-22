'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RouletteItem } from '@/types/roulette';
import { playTickSound, playWinChime } from '@/lib/sound';
import { Sparkles, Heart } from 'lucide-react';

interface RouletteWheelProps {
  items: RouletteItem[];
  onSpinEnd: (winner: RouletteItem) => void;
  disabled?: boolean;
  remainingSpins: number;
  onWheelClick?: () => void;
}

export default function RouletteWheel({
  items,
  onSpinEnd,
  disabled = false,
  remainingSpins,
  onWheelClick,
}: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const currentRotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef<number>(0);

  // 총 확률 합계 계산
  const totalProbability = items.reduce((acc, item) => acc + (Number(item.probability) || 0), 0) || 100;

  // 1. 룰렛 캔버스 그리기 함수
  const drawWheel = (rotationAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const scale = size / 380;
    const radius = center - 16 * scale;

    ctx.clearRect(0, 0, size, size);

    if (items.length === 0) {
      // 아이템이 없을 때 빈 룰렛 안내 렌더링
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFF5F7';
      ctx.fill();
      ctx.strokeStyle = '#FFCCD5';
      ctx.lineWidth = 4 * scale;
      ctx.stroke();

      ctx.fillStyle = '#FF4D6D';
      ctx.font = `bold ${Math.round(16 * scale)}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('등록된 항목이 없어요 😢', center, center - 12 * scale);
      ctx.font = `${Math.round(12 * scale)}px -apple-system, sans-serif`;
      ctx.fillStyle = '#888888';
      ctx.fillText('설정 화면에서 항목을 추가해주세요 💕', center, center + 14 * scale);
      ctx.restore();
      return;
    }

    // 외곽 귀여운 파스텔 그림자 링
    ctx.save();
    ctx.shadowColor = 'rgba(255, 175, 195, 0.35)';
    ctx.shadowBlur = 18 * scale;
    ctx.beginPath();
    ctx.arc(center, center, radius + 8 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    // 외곽 도트 장식 링
    ctx.beginPath();
    ctx.arc(center, center, radius + 4 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFE4EC';
    ctx.fill();

    // 부채꼴 슬롯들 렌더링
    let currentAngle = (rotationAngle * Math.PI) / 180;

    items.forEach((item, index) => {
      const prob = Math.max(0, Number(item.probability) || 0);
      const sliceAngle = (prob / totalProbability) * (2 * Math.PI);
      const endAngle = currentAngle + sliceAngle;

      // 부채꼴 채우기
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, currentAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = item.color || '#FFD1DC';
      ctx.fill();

      // 테두리 선
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();

      // 텍스트 및 음성 아이콘 그리기
      ctx.save();
      ctx.translate(center, center);
      const textAngle = currentAngle + sliceAngle / 2;
      ctx.rotate(textAngle);

      // 텍스트 위치 (반지름의 60% 지점)
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4A3B43';
      ctx.font = `bold ${Math.round(15 * scale)}px -apple-system, BlinkMacSystemFont, "Gowun Dodum", sans-serif`;

      let label = item.title || `항목 ${index + 1}`;
      let prefix = '';
      if (item.audio_url) prefix += '🎵';
      if (item.image_url) prefix += '🖼️';
      if (prefix) {
        label = `${prefix} ${label}`;
      }
      // 텍스트가 너무 길면 말줄임
      if (label.length > 13) {
        label = label.slice(0, 12) + '…';
      }

      ctx.fillText(label, radius - 24 * scale, 0);

      // 확률 % 표시
      ctx.font = `${Math.round(11 * scale)}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(74, 59, 67, 0.65)';
      ctx.fillText(`${prob}%`, radius - 24 * scale, 16 * scale);

      ctx.restore();

      currentAngle = endAngle;
    });

    // 외곽 림 (Rim) 테두리 장식
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4 * scale;
    ctx.stroke();

    // 림 위의 귀여운 진주알/도트 장식들 (24개)
    const dotCount = 24;
    for (let i = 0; i < dotCount; i++) {
      const dotAngle = (i * (360 / dotCount) * Math.PI) / 180;
      const dotX = center + (radius + 2 * scale) * Math.cos(dotAngle);
      const dotY = center + (radius + 2 * scale) * Math.sin(dotAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3 * scale, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FF8FA3' : '#FFCCD5';
      ctx.fill();
    }

    // 중앙 코어 핀 (러블리 하트 중앙 원)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 8 * scale;
    ctx.beginPath();
    ctx.arc(center, center, 28 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#FFB5C5';
    ctx.lineWidth = 3 * scale;
    ctx.stroke();

    // 중앙 작은 하트 표시
    ctx.font = `${Math.round(20 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💖', center, center);
    ctx.restore();
  };

  // 초기 렌더링 및 아이템 변경 시 다시 그리기
  useEffect(() => {
    drawWheel(currentRotationRef.current);
  }, [items, totalProbability]);

  // 2. 가중치 기반 당첨 아이템 선정 (Weighted Random)
  const selectWeightedWinner = (): { item: RouletteItem; index: number } => {
    const rand = Math.random() * totalProbability;
    let accumulated = 0;

    for (let i = 0; i < items.length; i++) {
      accumulated += items[i].probability;
      if (rand <= accumulated) {
        return { item: items[i], index: i };
      }
    }
    return { item: items[items.length - 1], index: items.length - 1 };
  };

  // 3. 룰렛 회전 애니메이션 시작
  const startSpin = () => {
    if (isSpinning || disabled || remainingSpins <= 0 || items.length === 0) return;

    setIsSpinning(true);

    // 당첨자 선정
    const { item: winnerItem, index: winnerIndex } = selectWeightedWinner();

    // 각 아이템의 부채꼴 각도 범위 계산
    let accumulatedAngle = 0;
    for (let i = 0; i < winnerIndex; i++) {
      accumulatedAngle += (items[i].probability / totalProbability) * 360;
    }
    const winnerSliceAngle = (winnerItem.probability / totalProbability) * 360;
    // 당첨 부채꼴의 정중앙 각도 (약간의 랜덤 지터 포함)
    const centerOfSlice = accumulatedAngle + winnerSliceAngle * (0.25 + Math.random() * 0.5);

    // 룰렛 바늘(핀)은 상단(270도 또는 -90도)에 위치함
    // 회전 후 270도 위치에 centerOfSlice가 와야 하므로
    const pointerAngle = 270;
    const targetSectorOffset = (pointerAngle - centerOfSlice + 360) % 360;

    const baseRounds = 5 + Math.floor(Math.random() * 3); // 5~7바퀴 완벽 회전
    const startAngle = currentRotationRef.current % 360;
    const totalRotation = baseRounds * 360 + targetSectorOffset - startAngle;
    const finalAngle = currentRotationRef.current + totalRotation;

    const duration = 4500; // 4.5초 동안 부드럽게 감속
    const startTime = performance.now();
    lastTickAngleRef.current = currentRotationRef.current;

    // 감속 커브 (Cubic ease-out)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(progress);

      const currentAngle = currentRotationRef.current + (finalAngle - currentRotationRef.current) * easedProgress;

      // 핀을 지나칠 때마다 경쾌한 틱 소리 재생
      const angleDiff = Math.abs(currentAngle - lastTickAngleRef.current);
      if (angleDiff > 25) {
        playTickSound(700 + Math.random() * 100);
        lastTickAngleRef.current = currentAngle;
      }

      drawWheel(currentAngle);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료
        currentRotationRef.current = finalAngle;
        drawWheel(finalAngle);
        setIsSpinning(false);
        playWinChime();
        onSpinEnd(winnerItem);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* 룰렛 컨테이너 & 상단 하트 포인터 */}
      <div
        role={onWheelClick && !isSpinning ? "button" : undefined}
        tabIndex={onWheelClick && !isSpinning ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isSpinning && onWheelClick) {
            e.preventDefault();
            onWheelClick();
          }
        }}
        onClick={() => {
          if (!isSpinning && onWheelClick) {
            onWheelClick();
          }
        }}
        className={`relative p-1.5 sm:p-3 rounded-full transition-all duration-200 ${
          !isSpinning && onWheelClick
            ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
            : ''
        }`}
        title={!isSpinning && onWheelClick ? "룰렛을 클릭하면 전체 항목을 볼 수 있어요!" : undefined}
      >
        {/* 상단 핀 (귀여운 하트 포인터 💘) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center filter drop-shadow-md pointer-events-none">
          <div className="w-8 h-9 text-rose-500 flex items-center justify-center animate-bounce">
            <svg viewBox="0 0 24 28" fill="none" className="w-8 h-9">
              <path
                d="M12 28L4 12C2.5 9 3.5 5 7 4C9.5 3.3 11 4.5 12 6C13 4.5 14.5 3.3 17 4C20.5 5 21.5 9 20 12L12 28Z"
                fill="#FF4D6D"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* 캔버스 휠 */}
        <canvas
          ref={canvasRef}
          width={760}
          height={760}
          style={{
            width: 'min(calc(100vw - 32px), calc(100dvh - 195px), 480px)',
            height: 'min(calc(100vw - 32px), calc(100dvh - 195px), 480px)',
          }}
          className="max-w-full aspect-square transition-transform"
        />
      </div>

      {/* 룰렛 터치/클릭 힌트 */}
      {onWheelClick && (
        <p className="text-[10.5px] sm:text-[11px] font-medium text-pink-400/90 mt-0.5 mb-1 sm:mb-1.5 flex items-center gap-1 animate-pulse">
          <span>💡 룰렛을 누르면 전체 항목을 볼 수 있어요</span>
        </p>
      )}

      {/* 돌리기 액션 버튼 (상단 타이틀 영역과 동일한 크기) */}
      <div className="w-full mt-1.5 sm:mt-2.5 flex flex-col items-center">
        <button
          onClick={startSpin}
          disabled={isSpinning || disabled || remainingSpins <= 0}
          className={`w-full py-3 sm:py-3.5 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg tracking-wide shadow-md transition-all duration-300 flex items-center justify-center gap-2 ${
            isSpinning
              ? 'bg-pink-300 text-white cursor-wait opacity-80'
              : remainingSpins <= 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 hover:from-pink-600 hover:to-rose-500 text-white shadow-md hover:shadow-lg active:scale-[0.98] animate-pulse-glow cursor-pointer'
          }`}
        >
          {isSpinning ? (
            <>
              <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
              <span>두근두근 추첨 중...</span>
            </>
          ) : remainingSpins <= 0 ? (
            <>
              <Heart className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
              <span>오늘 스핀을 모두 썼어요</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>룰렛 돌리기! 💖</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
