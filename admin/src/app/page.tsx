'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '../components/landing/LandingPage';
import { resolveVedamatchSurface } from '../lib/vedamatch-hosts';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const surface = typeof window !== 'undefined' ? resolveVedamatchSurface(window.location.hostname) : 'local';
    if (surface === 'portal') {
      router.replace('/admin-login');
      return;
    }

    const data = localStorage.getItem('admin_data');
    if (data) {
      router.replace('/user/dashboard');
    }
  }, [router]);

  return <LandingPage />;
}
