'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import AudioRecorder from './AudioRecorder';
import ImageUploader from './ImageUploader';
import ShareModal from './ShareModal';
import ColorPickerModal from './ColorPickerModal';
import defaultItemSuggestions from '@/data/suggestions.json';
import { RouletteItem, RouletteData, ResetMode } from '@/types/roulette';
import {
  adjustBonusSpins,
  calculateRemainingSpins,
  generateUUID,
  PASTEL_PALETTE,
  saveRouletteData,
  uploadAudioFile,
  uploadImageFile,
} from '@/lib/storage';
import {
  Heart,
  Plus,
  Trash2,
  Save,
  Share2,
  Calendar,
  Gift,
  Clock,
  Sparkles,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  LockOpen,
  Minus,
  Lightbulb,
  Palette,
  ImageIcon,
  MessageSquare,
  Volume2,
} from 'lucide-react';

interface SettingsFormProps {
  initialRoulette?: RouletteData;
  initialItems?: RouletteItem[];
  isEditMode?: boolean;
}

export default function SettingsForm({
  initialRoulette,
  initialItems,
  isEditMode = false,
}: SettingsFormProps) {
  const targetInitial = initialRoulette;

  // 1. 룰렛 기본 상태
  const defaultInitialPassword = process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234';
  const [rouletteId] = useState<string>(targetInitial?.id || generateUUID());
  const [editKey, setEditKey] = useState<string>(targetInitial?.edit_key || defaultInitialPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(targetInitial?.title || '');
  const [resetMode, setResetMode] = useState<ResetMode>(targetInitial?.reset_mode || 'daily');
  const [dailySpins, setDailySpins] = useState<number>(targetInitial?.daily_spins ?? 3);
  const [totalSpins, setTotalSpins] = useState<number>(targetInitial?.total_spins ?? 10);
  const [bonusSpins, setBonusSpins] = useState<number>(targetInitial?.bonus_spins ?? 0);
  const [usedSpins] = useState<number>(targetInitial?.used_spins ?? 0);
  const [lastResetDate] = useState<string>(targetInitial?.last_reset_date || new Date().toISOString().slice(0, 10));

  // 유효 기간 설정
  const [usePeriod, setUsePeriod] = useState<boolean>(Boolean(targetInitial?.valid_from || targetInitial?.valid_until));
  const [validFrom, setValidFrom] = useState<string>(
    targetInitial?.valid_from ? targetInitial.valid_from.slice(0, 16) : ''
  );
  const [validUntil, setValidUntil] = useState<string>(
    targetInitial?.valid_until ? targetInitial.valid_until.slice(0, 16) : ''
  );

  // 2. 룰렛 아이템 리스트 상태 (신규 생성 시 2개 항목 50%+50%=100%)
  const [items, setItems] = useState<RouletteItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((it) => ({
        ...it,
        probability: Math.floor(Number(it.probability) || 0),
      }))
      : [
      ]
  );

  // 새 녹음/업로드 파일 임시 보관
  const [pendingAudios, setPendingAudios] = useState<Record<string, { blob: Blob | File; localUrl: string }>>({});
  // 새 이미지 파일 임시 보관
  const [pendingImages, setPendingImages] = useState<Record<string, { file: File; localUrl: string }>>({});

  // UI 상태
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedRouletteId, setSavedRouletteId] = useState<string>(rouletteId);
  const [colorPickerTargetItemId, setColorPickerTargetItemId] = useState<string | null>(null);

  // 저장 완료 여부: 저장을 완료해야 '테스트 해보기' 활성화
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const isInitialMount = useRef(true);

  // 설정 내용이 변경되면 저장 상태를 false로 전환 (초기 로드 제외)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setIsSaved(false);
  }, [title, editKey, resetMode, dailySpins, totalSpins, usePeriod, validFrom, validUntil, items]);

  // 추천 문장 로드 및 활성 아이템 자동완성 상태 (data/suggestions.json 기반 500+개 문장)
  const [recommendations, setRecommendations] = useState<string[]>(
    Array.isArray(defaultItemSuggestions) ? (defaultItemSuggestions as string[]) : []
  );
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/recommendations')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.recommendations) && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }
      })
      .catch((err) => console.warn('Failed to load recommendations:', err));
  }, []);

  // 특정 항목 입력값에 따른 추천 문장 필터링
  const getSuggestionsForItem = (currentTitle: string): string[] => {
    if (!recommendations || recommendations.length === 0) return [];
    const query = currentTitle.trim().toLowerCase();
    if (!query) {
      return recommendations.slice(0, 8);
    }
    return recommendations
      .filter((s) => s.toLowerCase().includes(query) && s.trim() !== currentTitle.trim())
      .slice(0, 10);
  };

  const handleSelectRecommendation = (itemId: string, selectedText: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, title: selectedText } : it))
    );
    setFocusedItemId(null);
  };

  // 3. 확률 합계 계산 (소수점은 무조건 자름 / 정수 합계)
  const totalProbability = items.reduce((acc, it) => acc + Math.floor(Number(it.probability) || 0), 0);
  const isProbabilityValid = totalProbability === 100;

  // 테스트 해보기 가능 여부: 저장 완료 & 확률 100% & 저장 중이 아님
  const canTest = Boolean(isSaved && isProbabilityValid && !saving && savedRouletteId);
  const testHref = `/game/${savedRouletteId}?mode=test&key=${editKey || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}`;

  const handleDisabledTestClick = () => {
    if (!isProbabilityValid) {
      alert(
        `룰렛 항목들의 확률 합계가 100%가 되어야 합니다. (현재: ${totalProbability}%)`
      );
    } else if (!isSaved) {
      alert('하단의 [저장하기] 버튼을 눌러 설정을 먼저 저장한 후 테스트해볼 수 있어요! ✨');
    }
  };

  // 4. 현재 남은 횟수 미리보기 계산
  const previewRoulette: RouletteData = {
    id: rouletteId,
    title,
    reset_mode: resetMode,
    daily_spins: dailySpins,
    total_spins: totalSpins,
    bonus_spins: bonusSpins,
    used_spins: usedSpins,
    last_reset_date: lastResetDate,
    valid_from: usePeriod && validFrom ? new Date(validFrom).toISOString() : undefined,
    valid_until: usePeriod && validUntil ? new Date(validUntil).toISOString() : undefined,
    edit_key: editKey.trim() || defaultInitialPassword,
    created_at: targetInitial?.created_at || new Date().toISOString(),
  };
  const { remaining } = calculateRemainingSpins(previewRoulette);

  // 5. 남은 횟수 즉시 보너스 부여 / 차감 액션
  const handleQuickAdjustBonus = async (delta: number) => {
    const nextBonus = bonusSpins + delta;
    setBonusSpins(nextBonus);

    // 이미 저장된 룰렛인 경우 DB/스토리지에 즉시 반영
    if (isEditMode) {
      await adjustBonusSpins(rouletteId, delta);
    }
  };

  // 6. 확률 균등 분할 (소수점 무조건 버림, 100% 미달 시 잔여 확률은 그대로 두고 저장 제한)
  const handleEqualizeProbabilities = () => {
    if (items.length === 0) return;
    const count = items.length;
    const base = Math.floor(100 / count);

    const updated = items.map((it) => ({
      ...it,
      probability: base,
    }));
    setItems(updated);
  };

  // 6-1. 개별 확률 직접 설정 (소수점 자동 버림 / 정수 변환)
  const handleSetProbability = (itemId: string, value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    const truncated = Math.floor(isNaN(num) ? 0 : num);
    const clamped = Math.max(0, Math.min(100, truncated));
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, probability: clamped } : it))
    );
  };

  // 6-2. 1% 또는 5% 단위 빠른 증감 (+1, -1, +5, -5)
  const handleAdjustProbability = (itemId: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const current = Math.floor(Number(it.probability) || 0);
        const nextVal = Math.max(0, Math.min(100, current + Math.floor(delta)));
        return { ...it, probability: nextVal };
      })
    );
  };

  // 6-3. 특정 항목에 잔여 확률을 몰아주어 원클릭으로 100% 맞춤
  const handleFillRemaining = (itemId: string) => {
    const otherSum = items
      .filter((it) => it.id !== itemId)
      .reduce((sum, it) => sum + Math.floor(Number(it.probability) || 0), 0);
    const needed = Math.max(0, Math.min(100, 100 - otherSum));
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, probability: needed } : it))
    );
  };

  // 6-4. 마지막 항목에 잔여 확률 채우기
  const handleFillRemainingLast = () => {
    if (items.length === 0) return;
    const lastItem = items[items.length - 1];
    handleFillRemaining(lastItem.id);
  };

  // 7. 아이템 추가
  const handleAddItem = () => {
    if (items.length >= 10) {
      alert('아이템은 최대 10개까지 추가할 수 있습니다.');
      return;
    }
    const colorIndex = items.length % PASTEL_PALETTE.length;
    const newItem: RouletteItem = {
      id: generateUUID(),
      roulette_id: rouletteId,
      title: `새로운 소원/벌칙 #${items.length + 1}`,
      probability: 0,
      color: PASTEL_PALETTE[colorIndex],
      sort_order: items.length,
    };
    setItems([...items, newItem]);
  };

  // 8. 아이템 삭제
  const handleRemoveItem = (id: string) => {
    if (items.length <= 2) {
      alert('룰렛은 최소 2개 이상의 항목이 필요합니다.');
      return;
    }
    setItems(items.filter((it) => it.id !== id));
  };

  // 9. 오디오 변경 핸들러
  const handleAudioChange = (
    itemId: string,
    audioBlob: Blob | null,
    audioUrl: string | null,
    duration?: number
  ) => {
    if (audioBlob && audioUrl) {
      setPendingAudios((prev) => ({
        ...prev,
        [itemId]: { blob: audioBlob, localUrl: audioUrl },
      }));
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, audio_url: audioUrl, audio_duration: duration, audio_name: '음성 메시지' }
            : it
        )
      );
    } else {
      // 음성 삭제
      setPendingAudios((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, audio_url: undefined, audio_duration: undefined, audio_name: undefined }
            : it
        )
      );
    }
  };

  // 9-1. 텍스트 메시지 변경 핸들러
  const handleTextMessageChange = (itemId: string, text: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, text_message: text } : it))
    );
  };

  // 9-2. 이미지 변경 핸들러
  const handleImageChange = (
    itemId: string,
    imageFile: File | null,
    imageUrl: string | null,
    imageName?: string
  ) => {
    if (imageFile && imageUrl) {
      setPendingImages((prev) => ({
        ...prev,
        [itemId]: { file: imageFile, localUrl: imageUrl },
      }));
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, image_url: imageUrl, image_name: imageName || imageFile.name }
            : it
        )
      );
    } else {
      // 이미지 삭제
      setPendingImages((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, image_url: undefined, image_name: undefined }
            : it
        )
      );
    }
  };

  // 10. 최종 룰렛 저장
  const handleSave = async () => {
    if (!title.trim()) {
      alert('룰렛 제목을 입력해주세요.');
      return;
    }
    if (!isProbabilityValid) {
      alert('확률의 합이 100%가 되어야 합니다.');
      return;
    }

    setSaving(true);

    try {
      // 1) 보류 중인 오디오 및 이미지 파일들 일괄 업로드
      const finalItems = await Promise.all(
        items.map(async (item) => {
          let updatedItem = { ...item };

          // 보류 중인 오디오 파일 업로드 (voice-messages 버킷)
          const pendingAudio = pendingAudios[item.id];
          if (pendingAudio) {
            const { url } = await uploadAudioFile(pendingAudio.blob, rouletteId, item.id);
            updatedItem.audio_url = url;
          }

          // 보류 중인 이미지 파일 업로드 (image-messages 버킷)
          const pendingImage = pendingImages[item.id];
          if (pendingImage) {
            const { url } = await uploadImageFile(pendingImage.file, rouletteId, item.id);
            updatedItem.image_url = url;
          }

          return updatedItem;
        })
      );

      // 2) 룰렛 및 아이템 저장
      const res = await saveRouletteData(previewRoulette, finalItems);

      if (res.success) {
        setSavedRouletteId(res.roulette.id);
        setIsSaved(true);
        // 최근 작업 룰렛 ID 로컬스토리지 갱신
        if (typeof window !== 'undefined') {
          localStorage.setItem('vr_last_roulette_id', res.roulette.id);
        }
        setShowShareModal(true);
      } else {
        alert(`저장 중 오류가 발생했습니다: ${res.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      console.error(e);
      alert('저장 도중 문제가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-2 sm:py-4 pb-28 flex flex-col gap-4 sm:gap-6">
      {/* 상단 헤더: 로고, 새로 만들기, 테스트 해보기 (저장 후 활성화) */}
      <Header
        isSettingsPage={true}
        canTest={canTest}
        testHref={testHref}
        onDisabledTestClick={handleDisabledTestClick}
      />

      {/* 1. 상단 안내 및 제목 설정 */}
      <div className="pastel-card rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-pink-500 font-extrabold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>{isEditMode ? '룰렛 설정 및 스핀 관리 💖' : '새로운 음성 룰렛 만들기 💕'}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700">룰렛 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 우리의 달콤한 커플 룰렛 💕"
            className="w-full px-4 py-2.5 bg-white border border-pink-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-pink-500" />
              <span>관리자 비밀번호</span>
            </label>
            <span className="text-[11px] text-pink-500 font-medium">세팅 화면 접속 시 필요</span>
          </div>
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
              placeholder={`비밀번호 (기본값: ${defaultInitialPassword})`}
              className="w-full pl-4 pr-11 py-2.5 bg-white border border-pink-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-pink-600 rounded-xl hover:bg-pink-50 transition-colors cursor-pointer"
              title={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              {showPassword ? (
                <LockOpen className="w-4 h-4 text-pink-500" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 남은 횟수 설정 & 기회 차감/부여 패널 */}
      <div className="pastel-card rounded-3xl p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-600 font-extrabold text-sm">
            <Gift className="w-4 h-4" />
            <span>남은 스핀 및 기간 설정</span>
          </div>
          {/* 현재 남은 스핀 실시간 프리뷰 */}
          <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-black">
            현재 상대방 남은 스핀: {resetMode === 'infinite' ? '무제한 ∞' : `${remaining}회`}
          </div>
        </div>

        {/* 2-1. 남은 횟수 차감 및 보너스 부여 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700">🎁 스핀 선물 & 차감 (관리자 제어)</span>
            <span className="text-[11px] text-purple-600 font-medium">
              현재 보너스: {bonusSpins > 0 ? `+${bonusSpins}` : bonusSpins}회
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            애교를 부렸거나 미션을 완료했을 때 스핀을 선물하거나 차감할 수 있어요!
          </p>

          <div className="grid grid-cols-2 gap-2.5 mt-1">
            <button
              type="button"
              onClick={() => handleQuickAdjustBonus(1)}
              className="py-2.5 px-3 bg-white hover:bg-pink-100 border border-pink-200 text-pink-700 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-pink-500" />
              <span>스핀 부여 (+1회) 💖</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickAdjustBonus(-1)}
              className="py-2.5 px-3 bg-white hover:bg-rose-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>스핀 차감 (-1회) ➖</span>
            </button>
          </div>
        </div>

        {/* 2-2. 기간 설정 & 하루에 몇 번씩? */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 리셋 모드 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-pink-500" />
              <span>스핀 초기화 주기</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setResetMode('daily')}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${resetMode === 'daily'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-pink-50'
                  }`}
              >
                하루 N회
              </button>
              <button
                type="button"
                onClick={() => setResetMode('total')}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${resetMode === 'total'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-pink-50'
                  }`}
              >
                총 N회
              </button>
              <button
                type="button"
                onClick={() => setResetMode('infinite')}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${resetMode === 'infinite'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-pink-50'
                  }`}
              >
                무제한 ∞
              </button>
            </div>
          </div>

          {/* 기본 횟수 입력 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700">
              {resetMode === 'daily'
                ? '하루 기본 횟수'
                : resetMode === 'total'
                  ? '전체 기본 횟수'
                  : '스핀 횟수 모드'}
            </label>
            {resetMode === 'infinite' ? (
              <div className="w-full px-3 py-2 bg-pink-50/80 border border-pink-200 rounded-xl text-xs font-bold text-pink-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                <span>스핀 제한 없이 자유롭게 무제한 플레이 가능 ✨</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={resetMode === 'daily' ? dailySpins : totalSpins}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    if (resetMode === 'daily') setDailySpins(val);
                    else setTotalSpins(val);
                  }}
                  className="w-full px-3 py-2 bg-white border border-pink-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none"
                />
                <span className="text-xs font-semibold text-gray-500 flex-shrink-0">회</span>
              </div>
            )}
          </div>
        </div>

        {/* 2-3. 기간 유효 설정 (시작일시 ~ 종료일시) */}
        <div className="pt-2 border-t border-pink-100 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={usePeriod}
                onChange={(e) => setUsePeriod(e.target.checked)}
                className="w-4 h-4 text-pink-500 rounded focus:ring-pink-400 accent-pink-500"
              />
              <Calendar className="w-3.5 h-3.5 text-pink-500" />
              <span>특정 유효 기간 설정하기 (기념일/발렌타인데이 등)</span>
            </label>
          </div>

          {usePeriod && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-pink-50/50 p-3 rounded-2xl border border-pink-100 animate-fade-in">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-gray-600">시작 일시</span>
                <input
                  type="datetime-local"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-pink-200 rounded-xl text-xs text-gray-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-gray-600">종료 일시</span>
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-pink-200 rounded-xl text-xs text-gray-700"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. 룰렛 아이템 & 음성 매핑 & 확률 편집기 */}
      <div className="pastel-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col gap-3.5 sm:gap-4 relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-pink-600 font-extrabold text-xs sm:text-sm">
            <Percent className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
            <span>옵션 추가 / 확률 설정</span>
          </div>

          {/* 확률 균등 배분 버튼 */}
          <button
            type="button"
            onClick={handleEqualizeProbabilities}
            className="px-2.5 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-colors flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>확률을 균등하게 배분하기</span>
          </button>
        </div>

        {/* 확률 합계 게이지 바 */}
        <div className="bg-white/80 p-3 rounded-2xl border border-pink-200 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-1">
            <span className="text-gray-700">확률 합계</span>
            <div className="flex items-center gap-2">
              {!isProbabilityValid && totalProbability < 100 && (
                <button
                  type="button"
                  onClick={handleFillRemainingLast}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                  title="남은 확률을 마지막 항목에 추가하여 100%로 맞춥니다"
                >
                  <Sparkles className="w-2.5 h-2.5 text-pink-500" />
                  <span>남은 {100 - totalProbability}% 채우기</span>
                </button>
              )}
              <span
                className={
                  isProbabilityValid ? 'text-emerald-600 flex items-center gap-1' : 'text-rose-500 flex items-center gap-1'
                }
              >
                {isProbabilityValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>100% 정상</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>현재 {totalProbability}% (100%로 맞춰주세요)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            {items.map((it, idx) => (
              <div
                key={it.id || idx}
                style={{
                  width: `${Math.max(0, it.probability)}%`,
                  backgroundColor: it.color,
                }}
                className="h-full transition-all duration-300"
                title={`${it.title}: ${it.probability}%`}
              />
            ))}
          </div>
        </div>

        {/* 개별 아이템 리스트 */}
        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-white/95 border-2 border-pink-100 rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 shadow-sm hover:border-pink-300 transition-colors"
            >
              {/* 1행: 번호, 제목 입력, 추천 드롭다운, 삭제 버튼 */}
              <div className="relative flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>

                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={item.title}
                    onFocus={() => setFocusedItemId(item.id)}
                    onBlur={() => {
                      setTimeout(() => {
                        setFocusedItemId((prev) => (prev === item.id ? null : prev));
                      }, 200);
                    }}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setItems(items.map((it) => (it.id === item.id ? { ...it, title: newTitle } : it)));
                      setFocusedItemId(item.id);
                    }}
                    placeholder="항목 이름을 입력하세요 (예: 뽀뽀, 소원, 안마 등)"
                    className="w-full pl-3 pr-8 py-1.5 bg-pink-50/40 border border-pink-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-pink-300"
                  />

                  {/* 추천 문장 보기 버튼 */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFocusedItemId(focusedItemId === item.id ? null : item.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 p-0.5 rounded transition-colors cursor-pointer"
                    title="추천 문장 보기"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                  </button>

                  {/* 자동완성 / 추천 문장 드롭다운 */}
                  {focusedItemId === item.id && (() => {
                    const suggestions = getSuggestionsForItem(item.title);
                    return (
                      <div
                        onMouseDown={(e) => e.preventDefault()}
                        className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white/98 backdrop-blur-md border-2 border-pink-200 rounded-2xl shadow-xl p-2.5 max-h-64 overflow-y-auto flex flex-col gap-1 animate-fade-in"
                      >
                        {/* 상단 안내 바 */}
                        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-pink-500 border-b border-pink-100">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {item.title.trim()
                              ? `'${item.title.trim()}' 관련 추천 (${suggestions.length}개)`
                              : '💡 추천 룰렛 문장 (클릭 시 자동 입력)'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {suggestions.length > 0 ? '클릭하여 선택' : ''}
                          </span>
                        </div>

                        {/* 추천 문장 리스트 */}
                        <div className="flex flex-col gap-0.5 mt-1">
                          {suggestions.length > 0 ? (
                            suggestions.map((suggestion, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleSelectRecommendation(item.id, suggestion)}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-pink-100/70 hover:text-pink-700 transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <span className="truncate pr-2">{suggestion}</span>
                                <span className="text-[10px] text-pink-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  선택 ✨
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-center text-xs text-gray-400">
                              일치하는 추천 문장이 없어요. 직접 멋진 문장을 입력해보세요! 💖
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length <= 2}
                  className="p-1.5 text-gray-400 hover:text-rose-500 disabled:opacity-30 rounded-lg flex-shrink-0 transition-colors cursor-pointer"
                  title="항목 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* 2행: 룰렛 파스텔 색상 선택기 */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs font-semibold text-gray-600 flex-shrink-0">룰렛 색상:</span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {PASTEL_PALETTE.slice(0, 5).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setItems(items.map((it) => (it.id === item.id ? { ...it, color } : it)))
                      }
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer ${item.color?.toUpperCase() === color.toUpperCase()
                        ? 'ring-2 ring-pink-500 ring-offset-1 scale-110 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                        }`}
                      title={color}
                    />
                  ))}

                  {/* 2차원 색상표 / 상세 색상 피커 모달 열기 버튼 */}
                  <button
                    type="button"
                    onClick={() => setColorPickerTargetItemId(item.id)}
                    className="h-6 px-2 rounded-full border border-pink-300 bg-white hover:bg-pink-50 text-gray-700 shadow-xs flex items-center gap-1 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ml-1"
                    title="2차원 색상표 및 색상/채도/명도/RGB 직접 선택"
                  >
                    <div
                      style={{ backgroundColor: item.color || '#FFB5C5' }}
                      className="w-3 h-3 rounded-full border border-gray-300 shadow-2xs"
                    />
                    <Palette className="w-3 h-3 text-pink-500" />
                    <span>상세 선택</span>
                  </button>
                </div>
              </div>

              {/* 확률(%) 세부 조절 영역 */}
              <div className="flex flex-col gap-2 bg-pink-50/40 p-2.5 rounded-xl border border-pink-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-pink-500" />
                    <span>당첨 확률</span>
                  </span>

                  {/* 스마트 잔여 확률 100% 맞춤 버튼 */}
                  {totalProbability !== 100 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining(item.id)}
                      className="text-[11px] px-2.5 py-0.5 rounded-full bg-pink-100 hover:bg-pink-200 text-pink-700 font-bold flex items-center gap-1 transition-transform active:scale-95 shadow-2xs cursor-pointer"
                      title="이 항목을 조절하여 전체 확률을 100%로 맞춥니다"
                    >
                      <Sparkles className="w-3 h-3 text-pink-500" />
                      <span>
                        {totalProbability < 100
                          ? `+${Math.max(0, 100 - (totalProbability - item.probability)) - item.probability}% 채워 100% 맞춤`
                          : '100%로 맞춤'}
                      </span>
                    </button>
                  )}
                </div>

                {/* 슬라이더 + 1% 단위 스텝퍼 컨트롤러 */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={item.probability}
                    onChange={(e) => handleSetProbability(item.id, Number(e.target.value))}
                    className="flex-1 accent-pink-500 h-2 bg-pink-200/60 rounded-lg cursor-pointer min-w-0"
                  />

                  {/* 1% 단위 스텝퍼 [-1] [값%] [+1] */}
                  <div className="flex items-center bg-white border border-pink-300 rounded-xl p-0.5 shadow-xs flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAdjustProbability(item.id, -1)}
                      disabled={item.probability <= 0}
                      className="w-7 h-7 rounded-lg bg-pink-50 hover:bg-pink-100 disabled:opacity-25 text-pink-700 font-black text-xs flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                      title="1% 감소"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center px-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={item.probability}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            handleSetProbability(item.id, 0);
                            return;
                          }
                          const parsed = parseInt(raw, 10);
                          handleSetProbability(item.id, isNaN(parsed) ? 0 : parsed);
                        }}
                        className="w-8 bg-transparent text-xs font-black text-center text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] font-black text-pink-500">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdjustProbability(item.id, 1)}
                      disabled={item.probability >= 100}
                      className="w-7 h-7 rounded-lg bg-pink-50 hover:bg-pink-100 disabled:opacity-25 text-pink-700 font-black text-xs flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                      title="1% 증가"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 빠른 지정 바: 프리셋(5%, 10%, 20%, 25%, 50%) & 5% 증감 */}
                <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-semibold mr-0.5">빠른지정:</span>
                    {[5, 10, 20, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSetProbability(item.id, preset)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${item.probability === preset
                          ? 'bg-pink-500 text-white shadow-2xs scale-105'
                          : 'bg-white border border-pink-200 text-gray-600 hover:bg-pink-100/70 hover:text-pink-600'
                          }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>

                  {/* 5% 빠른 단위 증감 */}
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleAdjustProbability(item.id, -5)}
                      disabled={item.probability < 5}
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-white border border-pink-200 hover:bg-pink-50 disabled:opacity-30 text-gray-600 font-bold transition-colors cursor-pointer"
                      title="5% 빠르게 감소"
                    >
                      -5%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustProbability(item.id, 5)}
                      disabled={item.probability > 95}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-pink-200 hover:bg-pink-50 disabled:opacity-30 text-gray-600 font-bold transition-colors cursor-pointer"
                      title="5% 빠르게 증가"
                    >
                      +5%
                    </button>
                  </div>
                </div>
              </div>

              {/* 메시지 및 미디어 등록 영역 (텍스트 / 음성 / 이미지) */}
              <div className="flex flex-col gap-2.5 pt-1.5 border-t border-pink-100/90">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-pink-600 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    <span>당첨 선물 & 메시지 (선택 등록)</span>
                  </span>
                  {/* 등록 상태 뱃지 요약 */}
                  <div className="flex items-center gap-1">
                    {item.text_message?.trim() && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-600 font-bold flex items-center gap-0.5">
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>텍스트</span>
                      </span>
                    )}
                    {item.audio_url && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-600 font-bold flex items-center gap-0.5">
                        <Volume2 className="w-2.5 h-2.5" />
                        <span>음성</span>
                      </span>
                    )}
                    {item.image_url && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold flex items-center gap-0.5">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>이미지</span>
                      </span>
                    )}
                    {!item.text_message?.trim() && !item.audio_url && !item.image_url && (
                      <span className="text-[10px] text-gray-400 font-normal">
                        (원하는 것만 등록)
                      </span>
                    )}
                  </div>
                </div>

                {/* 1) 텍스트 메시지 입력 */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-pink-500" />
                      <span>축하/비밀 텍스트 메시지</span>
                    </label>
                    {item.text_message?.trim() && (
                      <button
                        type="button"
                        onClick={() => handleTextMessageChange(item.id, '')}
                        className="text-[10px] text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        지우기
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={item.text_message || ''}
                    onChange={(e) => handleTextMessageChange(item.id, e.target.value)}
                    placeholder="당첨 시 상대방에게 띄워줄 다정한 축하/비밀 메시지 (미입력 시 나타나지 않음)"
                    className="w-full px-3 py-2 bg-pink-50/30 hover:bg-pink-50/50 focus:bg-white border border-pink-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-300 resize-none transition-colors"
                  />
                </div>

                {/* 2) 음성 메시지 등록 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-pink-500" />
                    <span>음성 메시지 (녹음 또는 오디오 파일)</span>
                  </label>
                  <AudioRecorder
                    initialAudioUrl={item.audio_url}
                    initialAudioName={item.audio_name}
                    onAudioChange={(blob, url, duration) =>
                      handleAudioChange(item.id, blob, url, duration)
                    }
                  />
                </div>

                {/* 3) 이미지 메시지 등록 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                    <span>이미지 메시지 (사진 또는 쿠폰/티켓 이미지)</span>
                  </label>
                  <ImageUploader
                    initialImageUrl={item.image_url}
                    initialImageName={item.image_name}
                    onImageChange={(file, url, name) =>
                      handleImageChange(item.id, file, url, name)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 아이템 추가 버튼 */}
        <button
          type="button"
          onClick={handleAddItem}
          disabled={items.length >= 10}
          className="w-full py-3 border-2 border-dashed border-pink-300 hover:border-pink-400 bg-pink-50/50 hover:bg-pink-100/50 rounded-2xl text-xs font-bold text-pink-600 flex items-center justify-center gap-1.5 transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>새 항목 추가하기 ({items.length}/10)</span>
        </button>
      </div>

      {/* 4. 하단 저장 및 공유 버튼 바 */}
      <div className="sticky bottom-3 sm:bottom-4 z-30 bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-pink-200 shadow-xl flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!isProbabilityValid) {
              alert(`룰렛 항목들의 확률 합계가 100%가 되어야 저장할 수 있습니다. (현재: ${totalProbability}%)`);
              return;
            }
            handleSave();
          }}
          disabled={saving}
          className={`flex-1 py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 sm:gap-2 transition-transform active:scale-98 ${!isProbabilityValid
            ? 'bg-gray-300 hover:bg-gray-400 text-gray-600 cursor-not-allowed opacity-80'
            : 'bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 hover:from-pink-600 hover:to-rose-500 text-white animate-jelly'
            }`}
          title={!isProbabilityValid ? `확률의 합이 100%가 되어야 저장할 수 있습니다. (현재 ${totalProbability}%)` : undefined}
        >
          {saving ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>미디어 업로드 및 저장 중...</span>
            </>
          ) : !isProbabilityValid ? (
            <>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>확률 100% 맞춘 후 저장 가능 (현재 {totalProbability}%)</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 flex-shrink-0" />
              <span>{isEditMode ? '설정 및 스핀 저장하기 💕' : '나만의 룰렛 저장 & 링크 생성 ✨'}</span>
            </>
          )}
        </button>

        {isEditMode && (
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="py-3 sm:py-3.5 px-3 sm:px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-transform active:scale-95 shadow-sm flex-shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>공유</span>
          </button>
        )}
      </div>

      {/* 공유 링크 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
        }}
        rouletteId={savedRouletteId}
        editKey={editKey}
      />

      {/* 2차원 색상표 및 색상/채도/명도/RGB 상세 색상 선택기 모달 */}
      {colorPickerTargetItemId && (() => {
        const targetItem = items.find((it) => it.id === colorPickerTargetItemId);
        const targetIndex = items.findIndex((it) => it.id === colorPickerTargetItemId);
        if (!targetItem) return null;
        return (
          <ColorPickerModal
            isOpen={Boolean(colorPickerTargetItemId)}
            onClose={() => setColorPickerTargetItemId(null)}
            currentColor={targetItem.color || '#FFB5C5'}
            itemTitle={targetItem.title}
            itemIndex={targetIndex}
            onSelectColor={(newColor) => {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === colorPickerTargetItemId ? { ...it, color: newColor } : it
                )
              );
            }}
          />
        );
      })()}
    </div>
  );
}
