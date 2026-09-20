'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Sparkles, Heart, Plus } from 'lucide-react';

interface HeaderProps {
  isSettingsPage?: boolean;
  canTest?: boolean;
  testHref?: string;
  onDisabledTestClick?: () => void;
}

export default function Header({
  isSettingsPage = false,
  canTest = true,
  testHref,
  onDisabledTestClick,
}: HeaderProps) {
  const params = useParams();
  const rouletteId = (params?.id as string) || '';
  const playHref = testHref || (rouletteId ? `/game/${rouletteId}?mode=test` : '/');

  return (
    <header className="w-full max-w-lg mx-auto pt-5 px-4 pb-2 flex items-center justify-between">
      {/* 로고 */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-300 flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 group-hover:rotate-3">
          <Heart className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h1 className="text-lg font-black text-gray-800 tracking-tight group-hover:text-pink-600 transition-colors">
            보이스 룰렛
          </h1>
          <p className="text-[11px] text-pink-400 font-medium -mt-0.5">
            두근두근 💕
          </p>
        </div>
      </Link>

      {/* 세팅 페이지일 때 버튼들 표시 */}
      {isSettingsPage && (
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 새로 만들기 버튼: 테스트 해보기 좌측에 배치 */}
          <Link
            href="/settings"
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.location.pathname === '/settings') {
                e.preventDefault();
                window.location.href = '/settings';
              }
            }}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 shadow-2xs transition-transform active:scale-95 flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="새 룰렛 만들기"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새로 만들기</span>
          </Link>

          {/* 테스트 해보기 버튼 (저장 완료 및 확률 100% 일 때만 활성화) */}
          {canTest ? (
            <Link
              href={playHref}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white shadow-sm transition-transform active:scale-95 flex items-center gap-1 text-xs font-bold cursor-pointer animate-pulse-glow"
              title="스핀 소모 없이 테스트 플레이하기"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>테스트 해보기</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onDisabledTestClick}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-gray-100 text-gray-400 border border-gray-200 shadow-none flex items-center gap-1 text-xs font-bold cursor-not-allowed opacity-80 transition-colors"
              title="설정을 저장한 후 테스트할 수 있어요"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>테스트 해보기</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
