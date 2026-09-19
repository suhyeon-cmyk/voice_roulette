'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RedirectToGamePage() {
  const params = useParams();
  const router = useRouter();
  const rouletteId = params?.id as string;

  useEffect(() => {
    if (rouletteId) {
      router.replace(`/game/${rouletteId}`);
    }
  }, [rouletteId, router]);

  return null;
}
