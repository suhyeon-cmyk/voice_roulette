'use client';

import { RouletteItem } from '@/types/roulette';
import { X, Heart, Sparkles, Percent } from 'lucide-react';

interface ItemListModalProps {
  isOpen: boolean;
  onClose: () => void;
  rouletteTitle?: string;
  items: RouletteItem[];
}

export default function ItemListModal({
  isOpen,
  onClose,
  rouletteTitle,
  items,
}: ItemListModalProps) {
  if (!isOpen) return null;

  const displayTitle = rouletteTitle || '룰렛 항목';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md bg-white/95 rounded-3xl p-5 sm:p-6 border-2 border-pink-200 shadow-2xl flex flex-col gap-4 text-gray-700 animate-scale-up max-h-[85vh]"
        style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #fffbfd 100%)',
        }}
      >
        {/* 닫기 (X) 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-pink-600 hover:bg-pink-100 transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 모달 상단 헤더 */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-bold mb-1 shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>뭐가 나올까?</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight break-keep px-6">
            {displayTitle}
          </h3>
        </div>

        {/* 항목 리스트 영역 (모바일/PC 스크롤 지원) */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 max-h-[55vh]">
          {items.map((item, idx) => {
            return (
              <div
                key={item.id || idx}
                className="w-full rounded-2xl p-3.5 border transition-all hover:shadow-sm flex items-start gap-3 relative"
                style={{
                  backgroundColor: `${item.color || '#FFCCD5'}24`,
                  borderColor: `${item.color || '#FFCCD5'}99`,
                }}
              >
                {/* 순번 뱃지 */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-xs mt-0.5"
                  style={{ backgroundColor: item.color || '#FF8FA3' }}
                >
                  {idx + 1}
                </div>

                {/* 내용 및 부가 정보 */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* 전체 텍스트 (줄바꿈 허용, 말줄임 없음) */}
                  <p className="text-sm font-bold text-gray-800 break-words leading-relaxed whitespace-pre-wrap">
                    {item.title}
                  </p>

                  {/* 뱃지 라인 (확률 & 음성 안내) */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-gray-700 font-extrabold border border-pink-200/80 shadow-2xs">
                      <Percent className="w-3 h-3 text-pink-500" />
                      <span>{item.probability}%</span>
                    </span>

                    {/* 등록된 메시지 배지 표시 */}
                    {item.text_message?.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-600 border border-pink-200/90 shadow-2xs">
                        <span>💌 메시지</span>
                      </span>
                    )}
                    {item.audio_url && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200/90 shadow-2xs">
                        <span>🎙️ 음성</span>
                      </span>
                    )}
                    {item.image_url && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
                        <span>🖼️ 사진</span>
                      </span>
                    )}
                    {!item.text_message?.trim() && !item.audio_url && !item.image_url && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        (메시지 없음)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 요약 정보 및 닫기 버튼 */}
        <div className="pt-2 border-t border-pink-100 flex flex-col gap-2.5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>닫기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
