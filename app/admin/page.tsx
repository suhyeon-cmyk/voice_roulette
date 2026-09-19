'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Plus,
  Play,
  FlaskConical,
  Settings,
  Trash2,
  Copy,
  Check,
  Volume2,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  LogOut,
  Calendar,
  Clock,
  Percent,
  Layers,
  RotateCcw,
  Zap,
  X,
} from 'lucide-react';
import { RouletteData, RouletteItem } from '@/types/roulette';
import { deleteRouletteData } from '@/lib/storage';

interface AdminRouletteStats {
  roulette: RouletteData;
  items: RouletteItem[];
  itemCount: number;
  audioCount: number;
  totalProbability: number;
  remaining_spins: number;
  is_valid_period: boolean;
}

interface AdminDashboardData {
  roulettes: AdminRouletteStats[];
  stats: {
    totalRoulettes: number;
    totalItems: number;
    totalAudios: number;
    totalActiveSpins: number;
  };
}

export default function SuperAdminPage() {
  // 1. 마스터 관리자 인증 상태
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // 2. 대시보드 데이터 상태
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modeFilter, setModeFilter] = useState<'all' | 'daily' | 'total' | 'infinite'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'spins' | 'items' | 'title'>('newest');

  // 3. UI 유틸 상태 (복사 토글, 비밀번호 표시 토글, 처리 중 상태)
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeyIds, setVisibleKeyIds] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTargetRoulette, setDeleteTargetRoulette] = useState<RouletteData | null>(null);

  // 4. 마스터 관리자 비밀번호 변경 모달 상태
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [currentMasterPassword, setCurrentMasterPassword] = useState<string>('');
  const [newMasterPassword, setNewMasterPassword] = useState<string>('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [changePasswordError, setChangePasswordError] = useState<string>('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string>('');
  const [changePasswordLoading, setChangePasswordLoading] = useState<boolean>(false);

  // 마스터 비밀번호 변경 핸들러
  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!currentMasterPassword) {
      setChangePasswordError('현재 마스터 비밀번호를 입력해주세요.');
      return;
    }
    if (!newMasterPassword) {
      setChangePasswordError('새 비밀번호를 입력해주세요.');
      return;
    }
    if (newMasterPassword.length < 4) {
      setChangePasswordError('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setChangePasswordError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setChangePasswordLoading(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentMasterPassword,
          newPassword: newMasterPassword,
        }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setChangePasswordSuccess('비밀번호가 성공적으로 변경되었습니다!');
        setTimeout(() => {
          setShowPasswordChangeModal(false);
          setCurrentMasterPassword('');
          setNewMasterPassword('');
          setConfirmMasterPassword('');
          setChangePasswordSuccess('');
        }, 1500);
      } else {
        setChangePasswordError(resJson.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      setChangePasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  // 세션 스토리지 기반 마스터 인증 유지 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = sessionStorage.getItem('vr_master_admin_auth');
      if (savedAuth === 'true') {
        setIsAuthorized(true);
      }
    }
  }, []);

  // 룰렛 목록 데이터 불러오기
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roulette', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error('Failed to load admin roulettes');
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchDashboardData();
    }
  }, [isAuthorized]);

  // 마스터 로그인 제출
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError('마스터 관리자 비밀번호를 입력해주세요.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthorized(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('vr_master_admin_auth', 'true');
        }
      } else {
        setAuthError(json.error || '비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setAuthError('인증 요청 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 마스터 로그아웃
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vr_master_admin_auth');
    }
    setIsAuthorized(false);
    setPassword('');
    setData(null);
  };

  // ID / Key 클립보드 복사 유틸
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 비밀번호 표시 토글
  const toggleKeyVisibility = (rouletteId: string) => {
    setVisibleKeyIds((prev) => ({
      ...prev,
      [rouletteId]: !prev[rouletteId],
    }));
  };

  // 스핀 조정 액션 (PATCH)
  const handleAdjustSpin = async (rouletteId: string, action: 'adjust_bonus' | 'consume' | 'reset_spins', delta = 0) => {
    setActionLoadingId(rouletteId);
    try {
      const res = await fetch(`/api/roulette/${rouletteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, delta }),
      });
      if (res.ok) {
        await fetchDashboardData();
      } else {
        alert('스핀 조정에 실패했습니다.');
      }
    } catch {
      alert('스핀 조정 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 룰렛 삭제 액션 (DELETE)
  const handleDeleteRoulette = async () => {
    if (!deleteTargetRoulette) return;
    const rouletteId = deleteTargetRoulette.id;
    setActionLoadingId(rouletteId);

    try {
      await deleteRouletteData(rouletteId);
      setDeleteTargetRoulette(null);
      await fetchDashboardData();
    } catch {
      alert('룰렛 삭제 요청 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 필터링 및 정렬 연산
  const filteredRoulettes = useMemo(() => {
    const listSrc = data?.roulettes;
    if (!listSrc) return [];
    let list = [...listSrc];

    // 1. 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const itemRoulette = r.roulette;
        return (
          itemRoulette.title.toLowerCase().includes(q) ||
          itemRoulette.id.toLowerCase().includes(q) ||
          itemRoulette.edit_key?.toLowerCase().includes(q)
        );
      });
    }

    // 2. 모드 필터
    if (modeFilter !== 'all') {
      list = list.filter((r) => {
        const itemRoulette = r.roulette;
        return itemRoulette.reset_mode === modeFilter;
      });
    }

    // 3. 정렬
    list.sort((a, b) => {
      const aR = a.roulette;
      const bR = b.roulette;
      if (sortBy === 'newest') {
        return new Date(bR.created_at).getTime() - new Date(aR.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(aR.created_at).getTime() - new Date(bR.created_at).getTime();
      }
      if (sortBy === 'spins') {
        return b.remaining_spins - a.remaining_spins;
      }
      if (sortBy === 'items') {
        return b.itemCount - a.itemCount;
      }
      if (sortBy === 'title') {
        return aR.title.localeCompare(bR.title);
      }
      return 0;
    });

    return list;
  }, [data, searchQuery, modeFilter, sortBy]);

  // -------------------------------------------------------------
  // A. 인증 전: 마스터 관리자 로그인 게이트 화면
  // -------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col items-center gap-5 text-center relative overflow-hidden">
          {/* 네온 배경 효과 */}
          <div className="absolute -top-16 -left-16 w-36 h-36 bg-pink-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-purple-500/30 rounded-full blur-3xl" />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white/10">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-pink-400 bg-pink-500/10 py-1 px-3 rounded-full border border-pink-500/30 mx-auto">
              Super Admin Console
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              마스터 관리자 로그인
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed px-2">
              등록된 모든 사용자 룰렛 설정 조회, 테스트, 실행, 스핀 제어 및 삭제 권한에 접근합니다.
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3 mt-1">
            <div className="relative w-full">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="마스터 비밀번호 입력"
                autoFocus
                className="w-full pl-4 pr-11 py-3 bg-white/10 border border-white/20 rounded-2xl text-xs font-bold text-center text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white/15 shadow-inner transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-1"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>인증 확인 중...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>마스터 콘솔 진입하기</span>
                </>
              )}
            </button>
          </form>

          <Link
            href="/"
            className="text-[11px] text-gray-400 hover:text-pink-300 transition-colors mt-2 underline"
          >
            ← 메인 홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // B. 인증 완료: 찐 관리자 대시보드 본 화면
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. 상단 마스터 네비게이션 헤더 */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                통합 마스터 관리자 콘솔
              </h1>
              <span className="text-[10px] font-black text-pink-400 bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 rounded-full uppercase">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              등록된 모든 사용자 룰렛 설정 관리, 실시간 플레이/테스트, 스핀 제어 및 삭제
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/settings"
            target="_blank"
            className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="새 룰렛 등록 화면 열기"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 룰렛 생성</span>
          </Link>

          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            title="데이터 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setChangePasswordError('');
              setChangePasswordSuccess('');
              setCurrentMasterPassword('');
              setNewMasterPassword('');
              setConfirmMasterPassword('');
              setShowPasswordChangeModal(true);
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="마스터 관리자 비밀번호 변경"
          >
            <KeyRound className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">비밀번호 변경</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="관리자 로그아웃"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">로그아웃</span>
          </button>
        </div>
      </header>

      {/* 2. 대시보드 메인 본문 */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 flex flex-col gap-6">
        {/* 통계 요약 카드 4종 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>총 룰렛 수</span>
            </span>
            <span className="text-2xl font-black text-white">
              {data?.stats?.totalRoulettes ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">개</span>
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>총 등록 항목</span>
            </span>
            <span className="text-2xl font-black text-white">
              {data?.stats?.totalItems ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">개</span>
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>녹음된 음성 수</span>
            </span>
            <span className="text-2xl font-black text-white">
              {data?.stats?.totalAudios ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">개</span>
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>전체 활성 잔여 스핀</span>
            </span>
            <span className="text-2xl font-black text-white">
              {data?.stats?.totalActiveSpins ?? 0}
              <span className="text-xs font-normal text-slate-400 ml-1">회</span>
            </span>
          </div>
        </div>

        {/* 3. 검색 / 필터 / 정렬 컨트롤 바 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* 검색창 */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="룰렛 제목, 룰렛 ID, 설정 비밀번호 검색..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 리셋 모드 필터 */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
              {(
                [
                  { key: 'all', label: '전체 모드' },
                  { key: 'daily', label: '매일' },
                  { key: 'total', label: '전체' },
                  { key: 'infinite', label: '무제한 ∞' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setModeFilter(mode.key)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${modeFilter === mode.key
                      ? 'bg-pink-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* 정렬 드롭다운 */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-slate-900">최신 생성순</option>
                <option value="oldest" className="bg-slate-900">오래된 순</option>
                <option value="spins" className="bg-slate-900">잔여 스핀 많은순</option>
                <option value="items" className="bg-slate-900">아이템 많은순</option>
                <option value="title" className="bg-slate-900">제목 가나다순</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. 등록된 룰렛 카드 목록 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              검색 결과: <strong className="text-pink-400">{filteredRoulettes.length}</strong>개의 룰렛
            </span>
          </div>

          {filteredRoulettes.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
              <Sparkles className="w-10 h-10 text-slate-600" />
              <h3 className="text-base font-bold text-slate-300">등록된 룰렛이 없습니다.</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                사용자가 생성한 룰렛이 없거나 검색 필터 조건과 일치하는 항목이 없습니다.
              </p>
            </div>
          ) : (
            filteredRoulettes.map((item) => {
              const roulette = item.roulette;
              const { items, itemCount, audioCount, totalProbability, remaining_spins, is_valid_period } = item;
              const isKeyVisible = visibleKeyIds[roulette.id];
              const isActionLoading = actionLoadingId === roulette.id;

              return (
                <div
                  key={roulette.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-sm transition-all relative overflow-hidden"
                >
                  {/* 카드 상단: 룰렛 타이틀, ID 복사, 리셋 주기 뱃지 */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                          {roulette.title}
                        </h2>

                        {/* 리셋 모드 뱃지 */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {roulette.reset_mode === 'daily'
                            ? `매일 리셋 (${roulette.daily_spins}회)`
                            : roulette.reset_mode === 'total'
                              ? `전체 횟수제 (${roulette.total_spins}회)`
                              : '무제한 모드 ∞'}
                        </span>

                        {/* 확률 합계 뱃지 */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${totalProbability === 100
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                        >
                          확률 합계: {totalProbability}%
                        </span>

                        {/* 기간 유효성 뱃지 */}
                        {!is_valid_period && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            기간 만료/대기
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                          ID: {roulette.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(roulette.id, `id_${roulette.id}`)}
                          className="hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                          title="룰렛 ID 복사"
                        >
                          {copiedId === `id_${roulette.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 생성일 & 수정일 */}
                    <div className="text-[11px] text-slate-400 flex flex-col items-end gap-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        생성: {new Date(roulette.created_at).toLocaleDateString()} {new Date(roulette.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {roulette.updated_at && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="w-2.5 h-2.5" />
                          수정: {new Date(roulette.updated_at).toLocaleDateString()} {new Date(roulette.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 카드 중간: 비밀번호 + 스핀 현황 및 빠른 조작 바 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                    {/* 1) 룰렛 비밀번호 (edit_key) */}
                    <div className="flex flex-col gap-1.5 justify-center">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-pink-400" />
                        <span>설정 비밀번호 (개별 룰렛 설정키)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700 min-w-[80px] text-center">
                          {isKeyVisible ? roulette.edit_key || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234' : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(roulette.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                          title={isKeyVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                        >
                          {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(roulette.edit_key || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234', `key_${roulette.id}`)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                          title="비밀번호 복사"
                        >
                          {copiedId === `key_${roulette.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 2) 스핀 수치 현황 및 즉시 조작 (+1, -1, +5, -5, 리셋) */}
                    <div className="flex flex-col gap-1.5 justify-center">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>현재 잔여 스핀:</span>
                          <strong className="text-white text-xs">{remaining_spins}회</strong>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          (기본 {roulette.daily_spins || roulette.total_spins} / 사용 {roulette.used_spins || 0} / 보너스 {roulette.bonus_spins || 0})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-bold mr-0.5">보너스:</span>
                        {[-5, -1, 1, 5].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleAdjustSpin(roulette.id, 'adjust_bonus', delta)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-transform active:scale-95 cursor-pointer disabled:opacity-50 ${delta > 0
                                ? 'bg-pink-500/15 hover:bg-pink-500/30 text-pink-300 border-pink-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleAdjustSpin(roulette.id, 'consume')}
                          className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-transform active:scale-95 cursor-pointer disabled:opacity-50 ml-auto"
                          title="룰렛 1회 돌린 것으로 처리 (사용 스핀 +1)"
                        >
                          1회 소모
                        </button>

                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleAdjustSpin(roulette.id, 'reset_spins')}
                          className="px-2 py-1 bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                          title="사용 스핀과 보너스를 초기 상태(0)로 리셋"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>스핀 리셋</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 카드 하단 1: 아이템 리스트 프리뷰 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        <span>항목 목록 ({itemCount}개)</span>
                      </span>
                      <span className="text-[11px] text-purple-300">
                        음성 녹음: {audioCount} / {itemCount}개
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {items.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs overflow-hidden"
                          style={{ borderLeftColor: it.color || '#FFB5C5', borderLeftWidth: '4px' }}
                        >
                          <span className="truncate text-slate-200 font-medium" title={it.title}>
                            {it.title || '(무제)'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 ml-1.5 text-[11px] text-slate-400">
                            <span>{it.probability}%</span>
                            {it.audio_url && <Volume2 className="w-3 h-3 text-purple-400 shrink-0" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 카드 하단 2: 실행 및 수정/삭제 액션 버튼 바 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1) 일반 플레이 실행 */}
                      <Link
                        href={`/game/${roulette.id}`}
                        target="_blank"
                        className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                        title="실제 플레이 화면 새 탭 열기 (스핀 1회 소모)"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>🎮 플레이 실행</span>
                      </Link>

                      {/* 2) 무제한 테스트 모드 실행 */}
                      <Link
                        href={`/game/${roulette.id}?mode=test&key=${roulette.edit_key || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}`}
                        target="_blank"
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                        title="스핀 소모 없는 관리자 테스트 모드 실행"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>🧪 테스트 모드</span>
                      </Link>

                      {/* 3) 설정 수정 */}
                      <Link
                        href={`/settings/${roulette.id}?key=${roulette.edit_key || process.env.NEXT_PUBLIC_DEFAULT_SETTINGS_PASSWORD || '1234'}`}
                        target="_blank"
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                        title="해당 룰렛의 세팅 화면으로 바로 이동 (비밀번호 자동 인증)"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>⚙️ 설정 수정</span>
                      </Link>
                    </div>

                    {/* 4) 삭제 버튼 */}
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setDeleteTargetRoulette(roulette)}
                      className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="이 룰렛과 연결된 모든 아이템 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>룰렛 삭제</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 삭제 확인 모달 */}
      {deleteTargetRoulette && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center gap-4 text-center shadow-2xl animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-black text-white">룰렛 삭제 확인</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                정말로 <strong className="text-pink-400">'{deleteTargetRoulette.title}'</strong> 룰렛을 완전히 삭제하시겠습니까?
              </p>
              <p className="text-[11px] text-rose-400 mt-1">
                ⚠️ 삭제된 룰렛과 항목, 음성 데이터는 복구할 수 없습니다.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetRoulette(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteRoulette}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 마스터 비밀번호 변경 모달 */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-4 shadow-2xl animate-fade-in relative">
            <button
              type="button"
              onClick={() => setShowPasswordChangeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">마스터 비밀번호 변경</h3>
                <p className="text-xs text-slate-400">콘솔 접속 시 사용할 새로운 비밀번호를 설정합니다.</p>
              </div>
            </div>

            {changePasswordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{changePasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeMasterPassword} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300">현재 마스터 비밀번호</label>
                <input
                  type="password"
                  value={currentMasterPassword}
                  onChange={(e) => setCurrentMasterPassword(e.target.value)}
                  placeholder="현재 사용 중인 마스터 비밀번호"
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">새 마스터 비밀번호</label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showNewPassword ? '숨기기' : '보기'}</span>
                  </button>
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  placeholder="새 비밀번호 (4자 이상)"
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300">새 비밀번호 확인</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  placeholder="새 비밀번호 재입력"
                  className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
                  required
                />
              </div>

              <div className="flex items-center gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {changePasswordLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>변경 중...</span>
                    </>
                  ) : (
                    <span>비밀번호 저장</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
