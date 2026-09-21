import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rouletteId = ((formData.get('rouletteId') as string) || 'common').replace(/[^a-zA-Z0-9_-]/g, '');
    const itemId = ((formData.get('itemId') as string) || 'item').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'audio/webm';
    const ext = file.name?.split('.').pop() || (mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm');
    const safeFileName = `${rouletteId}/${itemId}_${Date.now()}.${ext}`;

    const supabase = getSupabaseAdmin();

    // 1) Supabase Storage 업로드
    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(safeFileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
          // 버킷이 없거나 권한 에러 시 Data URL로 안전하게 Fallback
          const base64 = buffer.toString('base64');
          return NextResponse.json({
            success: true,
            url: `data:${mimeType};base64,${base64}`,
            warning: `Supabase Storage upload warning: ${uploadError.message}`,
          });
        }

        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadData?.path || safeFileName);

        return NextResponse.json({
          success: true,
          url: publicUrlData.publicUrl,
        });
      } catch (storageErr) {
        console.error('Supabase Storage exception:', storageErr);
      }
    }

    // 2) Supabase 미설정 시 Base64 Data URL Fallback
    const base64 = buffer.toString('base64');
    return NextResponse.json({
      success: true,
      url: `data:${mimeType};base64,${base64}`,
      warning: 'Supabase credentials not configured. Using base64 Data URL.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Upload route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
