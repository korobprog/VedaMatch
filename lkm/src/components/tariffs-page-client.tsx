'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { LKMRegion } from '@/lib/host-config';
import {
  formatTemplate,
  LANGUAGE_LABELS,
  LANGUAGE_LOCALES,
  TARIFFS_I18N,
  type Language,
} from '@/lib/tariffs-i18n';
import {
  getLanguageFromSearch,
  resolveTariffsLanguage,
  saveTariffsLanguage,
} from '@/lib/tariffs-language';

export type TopupPackage = {
  lkmAmount: number;
  receiveLkm: number;
  totalPayAmount: number;
  payCurrency: string;
  nominalRub: number;
  nominalRubPerLkm: number;
  processingCostRub: number;
};

export type PackagesResponse = {
  region: LKMRegion;
  currency: string;
  gatewayCode: string;
  paymentMethod: string;
  nominalRubPerLkm: number;
  customMinLkm: number;
  customMaxLkm: number;
  customStepLkm: number;
  packages: TopupPackage[];
  disclaimer: string;
};

type Props = {
  initialHost: string;
  initialRegion: LKMRegion;
  initialCurrency: string;
  initialGatewayCode: string;
  apiBaseUrl: string;
};

const TOKEN_KEY = 'lkm_access_token';

function sanitizeApiBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.trim().replace(/\\+/g, '/').replace(/\/+$/, '');
}

function formatNumber(language: Language, value: number, digits = 2): string {
  return new Intl.NumberFormat(LANGUAGE_LOCALES[language], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export default function TariffsPageClient({
  initialHost,
  initialRegion,
  initialCurrency,
  initialGatewayCode,
  apiBaseUrl,
}: Props) {
  const normalizedApiBaseUrl = useMemo(() => sanitizeApiBaseUrl(apiBaseUrl), [apiBaseUrl]);
  const [language, setLanguage] = useState<Language>('en');
  const [packages, setPackages] = useState<PackagesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const dictionary = TARIFFS_I18N[language];

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        region: initialRegion,
        currency: initialCurrency,
        gatewayCode: initialGatewayCode,
        paymentMethod: 'default',
      });
      const token =
        typeof window === 'undefined' ? '' : (window.localStorage.getItem(TOKEN_KEY) || '').trim();
      const response = await fetch(`${normalizedApiBaseUrl}/lkm/packages?${params.toString()}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      const payload = (await response.json()) as PackagesResponse;
      setPackages(payload);
    } catch (fetchError) {
      setPackages(null);
      setError(fetchError instanceof Error ? fetchError.message : 'NETWORK_ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [initialCurrency, initialGatewayCode, initialRegion, normalizedApiBaseUrl]);

  useEffect(() => {
    const resolved = resolveTariffsLanguage();
    setLanguage(resolved);
    const fromQuery = getLanguageFromSearch(window.location.search);
    if (!fromQuery) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', resolved);
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    }
  }, []);

  useEffect(() => {
    void fetchPackages();
  }, [fetchPackages]);

  const examplePackage = useMemo(() => {
    if (!packages || packages.packages.length === 0) {
      return null;
    }
    return packages.packages[0];
  }, [packages]);

  const onLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    saveTariffsLanguage(nextLanguage);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', nextLanguage);
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    }
  };

  return (
    <main className="page-shell tariffs-shell">
      <section className="hero-card">
        <p className="hero-domain">{initialHost || 'lkm.vedamatch'}</p>
        <h1>{dictionary.pageTitle}</h1>
        <p className="hero-subtitle">{dictionary.pageSubtitle}</p>
        <div className="hero-meta">
          <span>{dictionary.regionLabel}: {initialRegion}</span>
          <span>{dictionary.currencyLabel}: {initialCurrency}</span>
          <span>{dictionary.gatewayLabel}: {initialGatewayCode}</span>
        </div>
      </section>

      <section className="panel tariffs-topbar">
        <Link href={`/?lang=${language}`} className="secondary tariffs-back-link">
          {dictionary.backToCabinet}
        </Link>
        <label className="tariffs-language-select">
          {dictionary.languageLabel}
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as Language)}
          >
            <option value="ru">{LANGUAGE_LABELS.ru}</option>
            <option value="en">{LANGUAGE_LABELS.en}</option>
            <option value="hi">{LANGUAGE_LABELS.hi}</option>
          </select>
        </label>
      </section>

      {isLoading ? (
        <section className="panel">
          <p>{dictionary.loading}</p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="panel">
          <h2>{dictionary.errorTitle}</h2>
          <p className="note">{dictionary.errorDescription}</p>
          <button type="button" onClick={() => void fetchPackages()}>
            {dictionary.retry}
          </button>
        </section>
      ) : null}

      {!isLoading && !error && (!packages || packages.packages.length === 0) ? (
        <section className="panel">
          <h2>{dictionary.emptyTitle}</h2>
          <p className="note">{dictionary.emptyDescription}</p>
        </section>
      ) : null}

      {!isLoading && !error && packages ? (
        <>
          <section className="panel">
            <h2>{dictionary.sectionHowTitle}</h2>
            <ol className="tariffs-steps">
              {dictionary.howSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="panel">
            <h2>{dictionary.sectionTariffsTitle}</h2>
            <p className="note">{dictionary.sectionTariffsSubtitle}</p>
            <div className="tariffs-meta-grid">
              <p><strong>{dictionary.paymentMethodLabel}:</strong> {packages.paymentMethod}</p>
              <p>
                <strong>{dictionary.limitsLabel}:</strong>{' '}
                {formatTemplate(dictionary.limitsTemplate, {
                  min: packages.customMinLkm,
                  max: packages.customMaxLkm,
                  step: packages.customStepLkm,
                })}
              </p>
            </div>

            <div className="tariffs-table-wrap">
              <table className="tariffs-table">
                <thead>
                  <tr>
                    <th>{dictionary.lkmColumn}</th>
                    <th>{dictionary.receiveColumn}</th>
                    <th>{dictionary.payColumn}</th>
                    <th>{dictionary.pricePerLkmColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.packages.map((pkg) => {
                    const pricePerLkmPay = pkg.receiveLkm > 0 ? pkg.totalPayAmount / pkg.receiveLkm : 0;
                    return (
                      <tr key={`${pkg.lkmAmount}-${pkg.totalPayAmount}`}>
                        <td>{pkg.lkmAmount}</td>
                        <td>{pkg.receiveLkm} LKM</td>
                        <td>{formatNumber(language, pkg.totalPayAmount)} {pkg.payCurrency}</td>
                        <td>
                          {formatNumber(language, pricePerLkmPay)} {pkg.payCurrency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>{dictionary.sectionExampleTitle}</h2>
            {examplePackage ? (
              <p>
                {dictionary.exampleLead} <strong>{examplePackage.lkmAmount} LKM</strong>:{' '}
                {formatNumber(language, examplePackage.totalPayAmount)} {examplePackage.payCurrency}
                {' '}→ {examplePackage.receiveLkm} LKM.
              </p>
            ) : null}
          </section>

          <section className="panel">
            <h2>{dictionary.sectionImportantTitle}</h2>
            <ul className="tariffs-list">
              {dictionary.importantItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {packages.disclaimer ? (
              <p className="note">
                <strong>{dictionary.backendDisclaimerLabel}:</strong> {packages.disclaimer}
              </p>
            ) : null}
          </section>

          <section className="panel">
            <h2>{dictionary.sectionFaqTitle}</h2>
            <div className="tariffs-faq">
              {dictionary.faq.map((item) => (
                <article key={item.question} className="tariffs-faq-item">
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
