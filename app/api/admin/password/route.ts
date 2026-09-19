import { NextRequest, NextResponse } from 'next/server';
import { getMasterAdminPassword, saveMasterAdminPassword } from '@/lib/serverStorage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const currentMaster = getMasterAdminPassword();
    if (currentPassword.trim() !== currentMaster) {
      return NextResponse.json(
        { success: false, error: '현재 마스터 관리자 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    const trimmedNew = newPassword.trim();
    if (trimmedNew.length < 4) {
      return NextResponse.json(
        { success: false, error: '새 비밀번호는 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    saveMasterAdminPassword(trimmedNew);

    return NextResponse.json({
      success: true,
      message: '마스터 관리자 비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
