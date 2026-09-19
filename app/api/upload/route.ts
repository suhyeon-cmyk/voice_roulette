import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const roomId = formData.get('roomId') as string || 'common';
    const itemId = formData.get('itemId') as string || 'item';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = file.name?.split('.').pop() || (file.type.includes('mp4') ? 'm4a' : 'webm');
    const safeFileName = `${roomId}_${itemId}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, safeFileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFileName}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
