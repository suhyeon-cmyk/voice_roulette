'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import SettingsForm from '@/components/SettingsForm';
import { getRouletteRoom } from '@/lib/storage';
import { RouletteRoom, RouletteItem } from '@/types/roulette';
import { Sparkles, Lock, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function RoomSettingsWithPasswordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params?.id as string;
  const urlKey = searchParams.get('key') || '';

  const [room, setRoom] = useState<RouletteRoom | null>(null);
  const [items, setItems] = useState<RouletteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    // 기존 세션스토리지에 남아있던 인증 캐시가 있다면 완전 제거
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`vr_auth_${roomId}`);
      } catch { }
    }

    const loadData = async () => {
      setLoading(true);
      const data = await getRouletteRoom(roomId);
      if (data) {
        setRoom(data.room);
        setItems(data.items);

        // URL 파라미터로 관리자 키가 직접 전달된 경우에만 즉시 인증 (?key=...)
        const defaultSettingsPassword = process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234';
        const expectedKey = data.room.edit_key || defaultSettingsPassword;
        if (urlKey && urlKey === expectedKey) {
          setIsAuthorized(true);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [roomId, urlKey]);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    const defaultSettingsPassword = process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234';
    const trimmed = password.trim();
    // 방에 저장된 비밀번호(edit_key)와만 정확히 일치해야 함 (미설정 시 기본 설정 비밀번호)
    const expectedKey = room.edit_key || defaultSettingsPassword;
    if (trimmed && trimmed === expectedKey) {
      setIsAuthorized(true);
      setErrorMessage('');
    } else {
      setErrorMessage('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-pink-400 min-h-[70vh]">
        <Sparkles className="w-8 h-8 animate-spin mb-2" />
        <p className="text-xs font-bold">룰렛 설정 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[80vh] animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200/70 text-rose-500 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-1.5 tracking-tight">
          룰렛 정보를 찾을 수 없습니다.
        </h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-xs">
          삭제되었거나 존재하지 않는 룰렛입니다.<br />설정 변경이 불가능합니다.
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

  // 비밀번호 인증 전 화면
  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-between pb-12 min-h-screen">
        <Header
          isSettingsPage={true}
          canTest={false}
          onDisabledTestClick={() => alert('비밀번호를 입력하고 세팅에 진입해주세요.')}
        />
        <div className="w-full max-w-sm mx-auto px-4 my-auto">
          <div className="pastel-card rounded-3xl p-6 sm:p-7 flex flex-col items-center gap-4 text-center shadow-lg border-2 border-pink-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-400 to-purple-400 text-white flex items-center justify-center shadow-md">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <span className="text-[11px] font-bold text-pink-500 bg-pink-100/70 py-0.5 px-2.5 rounded-full mx-auto">
                {room.title}
              </span>
              <h3 className="text-lg font-black text-gray-800 mt-1">설정 변경</h3>
            </div>

            <form onSubmit={handleVerifyPassword} className="w-full flex flex-col gap-3 mt-1">
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="관리자 비밀번호 입력"
                  autoFocus
                  className="w-full pl-4 pr-10 py-3 bg-white border border-purple-200 rounded-2xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-800 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <p className="text-[11px] font-bold text-rose-500 bg-rose-50 py-1.5 px-2.5 rounded-xl border border-rose-200 animate-shake">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-2xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>확인</span>
              </button>
            </form>

            <Link
              href={`/game/${roomId}`}
              className="text-xs font-bold text-pink-500 hover:text-pink-600 hover:underline pt-1"
            >
              ← 돌아가서 룰렛 플레이하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 비밀번호 인증 완료 시 세팅 폼 렌더링
  return (
    <div className="flex-1 flex flex-col items-center justify-between pb-12">
      <main className="w-full">
        <SettingsForm
          initialRoom={room}
          initialItems={items}
          isEditMode={true}
        />
      </main>
    </div>
  );
}
