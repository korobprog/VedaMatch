'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const YANDEX_METRIKA_ID = 107021597;

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

function buildRelativeURL(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitialPage = useRef(false);

  useEffect(() => {
    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true;
      return;
    }

    if (typeof window.ym !== 'function') {
      return;
    }

    const url = buildRelativeURL(pathname, searchParams);
    window.ym(YANDEX_METRIKA_ID, 'hit', url, {
      title: document.title,
      referer: document.referrer,
    });
  }, [pathname, searchParams]);

  return null;
}
