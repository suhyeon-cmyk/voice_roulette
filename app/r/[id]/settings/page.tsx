'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function RedirectToSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rouletteId = params?.id as string;
  const key = searchParams.get('key');

  useEffect(() => {
    if (rouletteId) {
      const target = key ? `/settings/${rouletteId}?key=${key}` : `/settings/${rouletteId}`;
      router.replace(target);
    }
  }, [rouletteId, key, router]);

  return null;
}
