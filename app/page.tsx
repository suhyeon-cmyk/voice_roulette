'use client';

import React from 'react';
import SettingsForm from '@/components/SettingsForm';

/**
 * 루트 (/) 페이지:
 * 특정 룰렛 ID 없이 루트 도메인으로 접속했을 때 다른 사용자의 룰렛이 노출되지 않도록,
 * 항상 새로운 룰렛을 만들 수 있는 세팅 생성 화면을 제공합니다.
 * 플레이는 공유받은 /game/[id] 링크를 통해서만 가능합니다.
 */
export default function RootHomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-between pb-12">
      <main className="w-full">
        <SettingsForm isEditMode={false} />
      </main>
    </div>
  );
}
