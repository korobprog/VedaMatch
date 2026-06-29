'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RootPortalHome from '../components/portal/RootPortalHome';
import { resolveVedamatchSurface } from '../lib/vedamatch-hosts';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const surface = typeof window !== 'undefined' ? resolveVedamatchSurface(window.location.hostname) : 'local';
    if (surface === 'portal') {
      router.replace('/admin-login');
    }
  }, [router]);

  return <RootPortalHome />;
}
