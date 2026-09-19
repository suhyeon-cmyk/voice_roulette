'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Heart, Key, Share2, X, Sparkles } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  rouletteId: string;
  editKey?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  rouletteId,
  editKey,
}: ShareModalProps) {
  const [copiedPlay, setCopiedPlay] = useState(false);
  const [copiedSettings, setCopiedSettings] = useState(false);

  if (!isOpen) return null;

  const targetId = rouletteId || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const playUrl = `${origin}/game/${targetId}`;
  const settingsUrl = `${origin}/settings/${targetId}`;

  const copyToClipboard = async (text: string, type: 'play' | 'settings') => {
    let success = false;

    // 1. 최신 Clipboard API 시도 (HTTPS / localhost 등 보안 컨텍스트)
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback execCommand', err);
      }
    }

    // 2. HTTP(IP 접속) 및 모바일 환경을 위한 execCommand 폴백
    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '-9999px';
        textArea.style.opacity = '0';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999); // 모바일 기기 대응

        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('execCommand copy error:', err);
      }
    }

    if (success) {
      if (type === 'play') {
        setCopiedPlay(true);
        setTimeout(() => setCopiedPlay(false), 2000);
      } else {
        setCopiedSettings(true);
        setTimeout(() => setCopiedSettings(false), 2000);
      }
    } else {
      // 3. 최후의 수단: 프롬프트 창으로 사용자가 바로 복사할 수 있도록 제공
      window.prompt('아래 링크를 길게 눌러(또는 Ctrl+C) 복사해주세요:', text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white/95 rounded-3xl p-5 sm:p-6 border-2 border-pink-200 shadow-2xl flex flex-col gap-4 sm:gap-5 text-gray-700 animate-scale-up">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-pink-600 rounded-full hover:bg-pink-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 mb-0.5 shadow-inner">
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">룰렛 공유하기 💕</h3>
          <p className="text-xs text-gray-500 leading-snug px-4">
            연인에게 보낼 링크와 나중에 수정할 수 있는 링크를 모두 제공합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
          {/* 1. 플레이 전용 공유 링크 */}
          <div className="bg-pink-50/70 border border-pink-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2 w-full overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>연인에게 보낼 플레이 링크</span>
            </div>
            <div className="flex items-center gap-2 w-full min-w-0">
              <input
                type="text"
                readOnly
                value={playUrl}
                onClick={() => copyToClipboard(playUrl, 'play')}
                className="flex-1 min-w-0 w-full bg-white border border-pink-200 rounded-xl px-3 py-2 text-xs text-gray-600 truncate focus:outline-none cursor-pointer select-all"
                title="클릭하여 복사"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(playUrl, 'play')}
                className="px-3.5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm flex-shrink-0 cursor-pointer min-w-[68px]"
              >
                {copiedPlay ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] text-pink-400 leading-tight">
              💌 이 링크를 전달하면 상대방이 바로 룰렛을 돌릴 수 있어요!
            </span>
          </div>

          {/* 2. 관리/세팅 전용 링크 */}
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2 w-full overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600">
              <Key className="w-3.5 h-3.5" />
              <span>나중에 수정할 수 있는 세팅(관리) 링크</span>
            </div>
            <div className="flex items-center gap-2 w-full min-w-0">
              <input
                type="text"
                readOnly
                value={settingsUrl}
                onClick={() => copyToClipboard(settingsUrl, 'settings')}
                className="flex-1 min-w-0 w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs text-gray-600 truncate focus:outline-none cursor-pointer select-all"
                title="클릭하여 복사"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(settingsUrl, 'settings')}
                className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm flex-shrink-0 cursor-pointer min-w-[68px]"
              >
                {copiedSettings ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 bg-purple-100/60 rounded-xl text-[11px] text-purple-700 leading-tight flex flex-col gap-1">
              <div>
                🔒 <strong>세팅 관리자 비밀번호</strong>: <span className="font-mono font-bold text-purple-900 bg-white/90 px-1.5 py-0.5 rounded border border-purple-200">{editKey || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}</span>
              </div>
              <p className="text-purple-600/90 text-[10px]">
                위 세팅 링크 접속 시 설정한 비밀번호를 입력하면 룰렛 확률, 음성 및 스핀을 관리할 수 있어요!
              </p>
            </div>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex items-center gap-2">
          <Link
            href={`/game/${targetId}?mode=test&key=${editKey || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}`}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>테스트 해보기</span>
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
