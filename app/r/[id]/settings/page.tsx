'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function RedirectToSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params?.id as string;
  const key = searchParams.get('key');

  useEffect(() => {
    if (roomId) {
      const target = key ? `/settings/${roomId}?key=${key}` : `/settings/${roomId}`;
      router.replace(target);
    }
  }, [roomId, key, router]);

  return null;
}
