'use client';

import React from 'react';
import Header from '@/components/Header';
import SettingsForm from '@/components/SettingsForm';

/**
 * /settings: 신규 룰렛 등록 전용 페이지
 * 기존 저장된 룰렛 데이터를 불러오지 않고, 항상 새로운 룰렛을 생성할 수 있는 상태로 제공합니다.
 * 기존 룰렛을 수정하려면 /settings/[id] 로 접속합니다.
 */
export default function NewRouletteSettingsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-between pb-12">
      <main className="w-full">
        <SettingsForm isEditMode={false} />
      </main>
    </div>
  );
}
