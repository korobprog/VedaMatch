import Script from 'next/script';

const YANDEX_METRIKA_ID = 107021597;

export default function YandexMetrikaScripts() {
  return (
    <>
      <Script id="yandex-metrika-init" strategy="beforeInteractive">
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
      <Script
        id="yandex-metrika-tag"
        src="https://mc.yandex.ru/metrika/tag.js"
        strategy="beforeInteractive"
      />
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
