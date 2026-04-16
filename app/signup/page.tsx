'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AuthScreen } from '@/components/auth/AuthScreen';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => {
        if (response.ok) {
          router.replace('/');
        }
      })
      .catch(() => {});
  }, [router]);

  return <AuthScreen initialMode="signup" onAuthenticated={() => router.replace('/login?registered=1')} showModeSwitch />;
}
