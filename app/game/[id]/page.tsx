'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import RouletteWheel from '@/components/RouletteWheel';
import ResultModal from '@/components/ResultModal';
import ItemListModal from '@/components/ItemListModal';
import { RouletteItem, RouletteState } from '@/types/roulette';
import { consumeSpin, getRouletteData } from '@/lib/storage';
import {
  Sparkles,
  Clock,
  AlertCircle,
  FlaskConical,
  Settings,
  Lock,
  Eye,
  EyeOff,
  X,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';

function GamePlayContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rouletteId = params?.id as string;
  const isModeTestRequested = searchParams.get('mode') === 'test';
  const urlKey = searchParams.get('key') || '';

  const [state, setState] = useState<RouletteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [winner, setWinner] = useState<RouletteItem | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  // 테스트 모드 인증 상태
  const [isTestAuthorized, setIsTestAuthorized] = useState<boolean>(false);
  const [verifiedKey, setVerifiedKey] = useState<string>('');
  const [showTestAuthModal, setShowTestAuthModal] = useState<boolean>(false);
  const [testAuthPassword, setTestAuthPassword] = useState<string>('');
  const [testAuthError, setTestAuthError] = useState<string>('');
  const [showTestPassword, setShowTestPassword] = useState<boolean>(false);

  useEffect(() => {
    if (!rouletteId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getRouletteData(rouletteId);
        setState(data);
        if (typeof window !== 'undefined') {
          if (data) {
            localStorage.setItem('vr_last_roulette_id', rouletteId);
          } else {
            if (localStorage.getItem('vr_last_roulette_id') === rouletteId) {
              localStorage.removeItem('vr_last_roulette_id');
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load roulette:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [rouletteId]);

  // 설정 화면 등에서 스핀 부여/수정 후 게임 화면으로 돌아올 때 즉시 자동 갱신
  useEffect(() => {
    const handleFocus = async () => {
      if (!rouletteId) return;
      try {
        const data = await getRouletteData(rouletteId);
        if (data) {
          setState(data);
        }
      } catch (err) {
        console.warn('Auto refresh on focus failed:', err);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [rouletteId]);

  // 1) 테스트 모드 권한 확인 Effect
  useEffect(() => {
    if (!state) return;
    const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234';
    const expectedKey = state.roulette.edit_key || defaultPassword;

    if (isModeTestRequested) {
      if (urlKey && urlKey === expectedKey) {
        // 올바른 관리자 키가 URL 파라미터로 함께 제공된 경우 (세팅 화면 / 관리자 콘솔 등에서 링크 클릭 시)
        setIsTestAuthorized(true);
        setVerifiedKey(urlKey);
        setShowTestAuthModal(false);
        setTestAuthError('');
      } else {
        // ?mode=test 로 직접 진입했거나 키가 틀린 경우 -> 비밀번호 인증 모달 띄우고 테스트 모드 진입 보류
        setIsTestAuthorized(false);
        setVerifiedKey('');
        setShowTestAuthModal(true);
      }
    } else {
      setIsTestAuthorized(false);
      setVerifiedKey('');
      setShowTestAuthModal(false);
      setTestAuthError('');
    }
  }, [state, isModeTestRequested, urlKey]);

  // 2) 테스트 모드 비밀번호 확인 제출 핸들러
  const handleVerifyTestPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state) return;

    const defaultPassword = process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234';
    const expectedKey = state.roulette.edit_key || defaultPassword;
    const trimmed = testAuthPassword.trim();

    if (trimmed && trimmed === expectedKey) {
      setIsTestAuthorized(true);
      setVerifiedKey(trimmed);
      setShowTestAuthModal(false);
      setTestAuthError('');
      setTestAuthPassword('');
      // URL 갱신: ?mode=test&key=... 형태로 저장하여 새로고침 시에도 인증 유지
      router.replace(`/game/${rouletteId}?mode=test&key=${encodeURIComponent(trimmed)}`);
    } else {
      setTestAuthError('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
    }
  };

  // 3) 테스트 모드 취소 (일반 플레이 화면으로 전환)
  const handleCancelTestAuth = () => {
    setShowTestAuthModal(false);
    setTestAuthError('');
    setTestAuthPassword('');
    setIsTestAuthorized(false);
    setVerifiedKey('');
    router.replace(`/game/${rouletteId}`);
  };

  // 실제 테스트 모드 활성 조건: URL 요청 & 관리자 비밀번호 인증 성공
  const isTestMode = isModeTestRequested && isTestAuthorized;

  const handleSpinEnd = (winnerItem: RouletteItem) => {
    if (!state) return;
    const roulette = state.roulette;

    // 1) 결과 모달 즉각 오픈 (대기 시간 0초!)
    setWinner(winnerItem);
    setShowResultModal(true);

    // 2) 일반 플레이 시 낙관적 차감 및 백그라운드 서버 동기화
    if (!isTestMode && roulette.reset_mode !== 'infinite') {
      setState((prev) =>
        prev
          ? { ...prev, remaining_spins: Math.max(0, prev.remaining_spins - 1) }
          : null
      );
      consumeSpin(roulette.id)
        .then((nextRemaining) => {
          setState((prev) =>
            prev ? { ...prev, remaining_spins: nextRemaining } : null
          );
        })
        .catch((err) => console.warn('Background spin consume error:', err));
    }
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

  const roulette = state.roulette;
  const items = state.items || [];
  const remaining = state.remaining_spins;
  const isValidPeriod = state.is_valid_period;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-2 sm:py-6 overflow-x-hidden">
      {/* 테스트 모드 상단 배너 및 설정으로 돌아가기 버튼 (인증 완료 시에만 노출) */}
      {isTestMode && (
        <div className="w-full max-w-[min(calc(100vw-32px),calc(100dvh-195px),480px)] mb-2 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white rounded-2xl shadow-md flex items-center justify-between gap-2 text-xs animate-fade-in border border-white/20">
          <div className="flex items-center gap-1.5 font-black">
            <FlaskConical className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>테스트 모드 (스핀 소모 없음)</span>
          </div>
          <Link
            href={verifiedKey ? `/settings/${rouletteId}?key=${encodeURIComponent(verifiedKey)}` : `/settings/${rouletteId}`}
            className="px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-700 font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>설정으로 돌아가기</span>
          </Link>
        </div>
      )}

      {/* 중앙 메인 콘텐츠 영역 */}
      <main className="w-full max-w-[min(calc(100vw-32px),calc(100dvh-195px),480px)] flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 my-auto">
        {/* 룰렛 타이틀 */}
        <div className="w-full pastel-card rounded-2xl sm:rounded-3xl px-3 py-2 sm:p-4 text-center flex flex-col items-center gap-0.5 sm:gap-1.5 shadow-sm">
          <h2 className="text-base sm:text-xl font-black text-gray-800 tracking-tight leading-snug">
            {roulette.title}
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
                    {roulette.reset_mode === 'infinite' ? '무제한 ∞' : `${remaining}회`}
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
        {!isTestMode && roulette.reset_mode !== 'infinite' && remaining <= 0 && (
          <div className="w-full bg-pink-100/70 border border-pink-200 rounded-2xl p-3 text-pink-800 text-xs text-center leading-relaxed">
            💖 오늘의 스핀을 모두 사용했어요!
          </div>
        )}

        {/* 룰렛 휠 (테스트 모드 또는 무제한 모드에서는 스핀 소진 제한 없이 가능) */}
        <div className="w-full flex justify-center">
          <RouletteWheel
            items={items}
            onSpinEnd={handleSpinEnd}
            disabled={!isValidPeriod || showResultModal || showTestAuthModal || (!isTestMode && roulette.reset_mode !== 'infinite' && remaining <= 0)}
            remainingSpins={isTestMode || roulette.reset_mode === 'infinite' ? 999 : remaining}
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
        rouletteId={rouletteId}
        editKey={isTestMode && verifiedKey ? verifiedKey : undefined}
      />

      {/* 룰렛 전체 항목 다이얼로그 모달 */}
      <ItemListModal
        isOpen={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        rouletteTitle={roulette.title}
        items={items}
      />

      {/* 테스트 모드 관리자 비밀번호 확인 모달 */}
      {showTestAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-scale-up border border-purple-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼: 취소하고 일반 모드로 전환 */}
            <button
              type="button"
              onClick={handleCancelTestAuth}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="닫기 (일반 플레이로 이동)"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 헤더 */}
            <div className="flex flex-col items-center text-center gap-2 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mb-1 border border-purple-200/60">
                  <Lock className="w-3 h-3" />
                  관리자 인증 필요
                </span>
                <h3 className="text-base font-black text-gray-900 tracking-tight">
                  테스트 모드 비밀번호 확인
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  스핀 소모 없는 무제한 테스트 모드는 룰렛 제작자만 이용할 수 있습니다.<br />
                  설정 시 등록한 관리자 비밀번호를 입력해주세요.
                </p>
              </div>
            </div>

            {/* 폼 */}
            <form onSubmit={handleVerifyTestPassword} className="flex flex-col gap-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showTestPassword ? 'text' : 'password'}
                  value={testAuthPassword}
                  onChange={(e) => {
                    setTestAuthPassword(e.target.value);
                    if (testAuthError) setTestAuthError('');
                  }}
                  placeholder="관리자 비밀번호 입력"
                  autoFocus
                  className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 border rounded-2xl text-xs font-medium focus:outline-none transition-all ${
                    testAuthError
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowTestPassword(!showTestPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showTestPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {testAuthError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium flex items-center gap-1.5 animate-shake">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{testAuthError}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-1">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:from-purple-700 hover:to-rose-600 text-white font-bold text-xs shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>인증하고 테스트 모드 시작</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelTestAuth}
                  className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition-colors cursor-pointer"
                >
                  일반 게임으로 플레이하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePlayRoulettePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-pink-400">
          <Sparkles className="w-10 h-10 animate-spin mb-3" />
          <p className="font-bold text-sm">연인의 룰렛을 불러오는 중...</p>
        </div>
      }
    >
      <GamePlayContent />
    </Suspense>
  );
}
