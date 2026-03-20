'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

const YANDEX_METRIKA_ID = 107021597;

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
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

  return (
    <>
      <Script src="https://mc.yandex.ru/metrika/tag.js" strategy="afterInteractive" />
      <Script id="yandex-metrika-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.ym = window.ym || function() { (window.ym.a = window.ym.a || []).push(arguments); };
          window.ym.l = Date.now();
          ym(${YANDEX_METRIKA_ID}, 'init', {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true,
            ecommerce: 'dataLayer'
          });
        `}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
