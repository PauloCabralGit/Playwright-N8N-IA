'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AuthScreen } from '@/components/auth/AuthScreen';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => {
        if (response.ok) {
          router.replace('/');
        }
      })
      .catch(() => {});
  }, [router]);

  return <AuthScreen initialMode="login" onAuthenticated={() => router.replace('/')} showModeSwitch />;
}
