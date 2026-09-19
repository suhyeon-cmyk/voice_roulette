import { NextResponse } from 'next/server';
import { getPresetRecommendations } from '@/lib/serverStorage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    const all = getPresetRecommendations();

    if (!q) {
      return NextResponse.json({ recommendations: all });
    }

    const queryLower = q.toLowerCase();
    const filtered = all.filter((sentence) =>
      sentence.toLowerCase().includes(queryLower)
    );

    return NextResponse.json({ recommendations: filtered });
  } catch (err) {
    console.error('Failed to get recommendations:', err);
    return NextResponse.json({ recommendations: [] }, { status: 500 });
  }
}
