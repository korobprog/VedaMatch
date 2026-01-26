'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '../components/landing/LandingPage';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem('admin_data');
    if (data) {
      router.replace('/user/dashboard');
    }
  }, [router]);

  return <LandingPage />;
}
