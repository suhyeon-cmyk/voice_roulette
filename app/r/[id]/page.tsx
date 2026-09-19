'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RedirectToGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  useEffect(() => {
    if (roomId) {
      router.replace(`/game/${roomId}`);
    }
  }, [roomId, router]);

  return null;
}
