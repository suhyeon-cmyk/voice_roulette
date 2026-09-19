import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rouletteId = (formData.get('rouletteId') as string) || 'common';
    const itemId = (formData.get('itemId') as string) || 'item';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // On Vercel / Serverless, filesystem is read-only, so return data URL directly
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION
    );

    if (isServerless) {
      const mime = file.type || 'audio/webm';
      const base64 = buffer.toString('base64');
      return NextResponse.json({ success: true, url: `data:${mime};base64,${base64}` });
    }

    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = file.name?.split('.').pop() || (file.type.includes('mp4') ? 'm4a' : 'webm');
      const safeFileName = `${rouletteId}_${itemId}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, safeFileName);

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/${safeFileName}`;
      return NextResponse.json({ success: true, url: publicUrl });
    } catch {
      // Fallback to data URL if filesystem write fails
      const mime = file.type || 'audio/webm';
      const base64 = buffer.toString('base64');
      return NextResponse.json({ success: true, url: `data:${mime};base64,${base64}` });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
