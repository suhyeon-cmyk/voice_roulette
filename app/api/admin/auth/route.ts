import { NextRequest, NextResponse } from 'next/server';
import { getMasterAdminPassword } from '@/lib/serverStorage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const masterPassword = await getMasterAdminPassword();

    if (password && password.trim() === masterPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: '관리자 마스터 비밀번호가 일치하지 않습니다.' },
      { status: 401 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
