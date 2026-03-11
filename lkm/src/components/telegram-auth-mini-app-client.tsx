'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CabinetDictionary } from '@/lib/cabinet-i18n';
import { LKM_CABINET_I18N } from '@/lib/cabinet-i18n';
import type { Language } from '@/lib/tariffs-i18n';
import {
  getLanguageFromSearch,
  resolveTariffsLanguage,
  saveTariffsLanguage,
} from '@/lib/tariffs-language';
import {
  buildTelegramMobileReturnLink,
  getOrCreateLkmDeviceID,
  getTelegramWebApp,
  isLkmVedamatchHost,
  openMobileReturnLink,
  persistTelegramLaunchParams,
  persistTelegramMiniAppHint,
  resolveMiniAppTargetHost,
  resolveTelegramBootstrapContext,
  type TelegramMiniAppUser,
} from '@/lib/telegram-mini-app';

type Props = {
  apiBaseUrl: string;
};

function sanitizeApiBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.trim().replace(/\\+/g, '/').replace(/\/+$/, '');
}

function buildTelegramDisplayName(user: TelegramMiniAppUser | null): string {
  if (!user) {
    return '';
  }
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (fullName) {
    return fullName;
  }
  if (user.username) {
    return `@${user.username}`;
  }
  if (user.id) {
    return `ID ${user.id}`;
  }
  return 'Telegram';
}

function buildTelegramInitials(label: string): string {
  if (!label) {
    return 'TG';
  }
  const parts = label.replace(/^@/, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'TG';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function buildTelegramAuthOnlyErrorMessage(error: unknown, copy: CabinetDictionary): string {
  if (!(error instanceof Error)) {
    return copy.errorUnknown;
  }
  const message = error.message || '';
  if (
    message.includes('TELEGRAM_AUTH_BOT_TOKEN_MISSING')
    || message.includes('TELEGRAM_AUTH_DISABLED')
    || message.includes('TELEGRAM_LINK_REQUIRED')
  ) {
    return copy.telegramAuthOnlyUnavailable;
  }
  if (message.includes('TELEGRAM_LINK_CONFLICT')) {
    return copy.errorTelegramConflict;
  }
  if (message.includes('TELEGRAM_INIT_DATA_REPLAY')) {
    return copy.errorTelegramSessionChecked;
  }
  if (message.includes('TELEGRAM_INIT_DATA_EXPIRED')) {
    return copy.errorTelegramDataExpired;
  }
  if (message.includes('TELEGRAM_MOBILE_AUTH_STATE')) {
    return copy.telegramAuthOnlyUnavailable;
  }
  return copy.telegramAuthOnlyUnavailable;
}

async function requestPublicJSON<T>(
  apiBaseUrl: string,
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
  } = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { error: raw };
    }
  }

  if (!response.ok) {
    const errorData = payload as { error?: string; errorCode?: string };
    const message = errorData.errorCode
      ? `${errorData.error || 'Request failed'} (${errorData.errorCode})`
      : errorData.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export default function TelegramAuthMiniAppClient({ apiBaseUrl }: Props) {
  const normalizedApiBaseUrl = useMemo(() => sanitizeApiBaseUrl(apiBaseUrl), [apiBaseUrl]);
  const [language, setLanguage] = useState<Language>('en');
  const copy = useMemo(() => LKM_CABINET_I18N[language], [language]);
  const [telegramUser, setTelegramUser] = useState<TelegramMiniAppUser | null>(null);
  const [telegramInitData, setTelegramInitData] = useState('');
  const [telegramMobileAuthState, setTelegramMobileAuthState] = useState('');
  const [telegramMobileFlowPurpose, setTelegramMobileFlowPurpose] = useState('');
  const [isBootstrapComplete, setIsBootstrapComplete] = useState(false);
  const [isTelegramMobileFlowContextResolved, setIsTelegramMobileFlowContextResolved] = useState(false);
  const [isTelegramMobileFlowContextFailed, setIsTelegramMobileFlowContextFailed] = useState(false);
  const [isTelegramAuthLoading, setIsTelegramAuthLoading] = useState(false);
  const [telegramAuthAttempted, setTelegramAuthAttempted] = useState(false);
  const [telegramMobileDeepLink, setTelegramMobileDeepLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mainPageHref = useMemo(() => `/?lang=${language}`, [language]);
  const telegramDisplayName = useMemo(() => buildTelegramDisplayName(telegramUser), [telegramUser]);
  const telegramInitials = useMemo(() => buildTelegramInitials(telegramDisplayName), [telegramDisplayName]);
  const telegramMobileReturnLink = useMemo(() => {
    if (!telegramMobileAuthState) {
      return '';
    }
    return telegramMobileDeepLink || buildTelegramMobileReturnLink(telegramMobileAuthState);
  }, [telegramMobileAuthState, telegramMobileDeepLink]);
  const isUnsupportedLinkFlow = isTelegramMobileFlowContextResolved && telegramMobileFlowPurpose === 'link';
  const isCheckingTelegramSession =
    !error
    && !success
    && (!isBootstrapComplete || !isTelegramMobileFlowContextResolved || isTelegramAuthLoading);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const resolvedLanguage = resolveTariffsLanguage();
    const resolvedCopy = LKM_CABINET_I18N[resolvedLanguage];
    setLanguage(resolvedLanguage);
    if (!getLanguageFromSearch(window.location.search)) {
      saveTariffsLanguage(resolvedLanguage);
      const url = new URL(window.location.href);
      url.searchParams.set('lang', resolvedLanguage);
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    }

    const bootstrapTelegramContext = () => {
      const telegramContext = resolveTelegramBootstrapContext(window.location);
      const telegramWebApp = getTelegramWebApp();

      setTelegramUser(telegramContext.user);

      if (!telegramContext.initData) {
        return false;
      }

      persistTelegramMiniAppHint();
      persistTelegramLaunchParams({
        initData: telegramContext.initData,
        startParam: telegramContext.startParam,
        user: telegramContext.user,
      });

      if (!telegramContext.mobileAuthState) {
        setError(resolvedCopy.telegramAuthOnlyUnavailable);
        setIsBootstrapComplete(true);
        setIsTelegramMobileFlowContextResolved(true);
        setIsTelegramMobileFlowContextFailed(true);
        return true;
      }

      const currentHost = window.location.hostname.toLowerCase();
      if (isLkmVedamatchHost(currentHost)) {
        const targetHost = resolveMiniAppTargetHost(telegramContext.languageCode);
        if (targetHost !== currentHost) {
          const nextURL = new URL(window.location.href);
          nextURL.hostname = targetHost;
          window.location.replace(nextURL.toString());
          return true;
        }
      }

      setTelegramInitData(telegramContext.initData);
      setTelegramMobileAuthState(telegramContext.mobileAuthState);
      setTelegramMobileDeepLink('');
      setError('');
      setSuccess('');
      setIsBootstrapComplete(true);
      telegramWebApp?.ready?.();
      telegramWebApp?.expand?.();
      return true;
    };

    if (bootstrapTelegramContext()) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (bootstrapTelegramContext()) {
        window.clearInterval(timer);
        return;
      }
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        setIsBootstrapComplete(true);
        setIsTelegramMobileFlowContextResolved(true);
        setIsTelegramMobileFlowContextFailed(true);
        setError(resolvedCopy.telegramAuthOnlyUnavailable);
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!telegramMobileAuthState) {
      return;
    }

    let cancelled = false;
    setIsTelegramMobileFlowContextResolved(false);
    setIsTelegramMobileFlowContextFailed(false);

    const loadTelegramMobileContext = async () => {
      try {
        const response = await requestPublicJSON<{ purpose?: string }>(
          normalizedApiBaseUrl,
          `/auth/telegram/mobile/state/${encodeURIComponent(telegramMobileAuthState)}`,
          {
            method: 'GET',
          },
        );
        if (cancelled) {
          return;
        }

        const nextPurpose = (response.purpose || '').trim();
        setTelegramMobileFlowPurpose(nextPurpose);
        setIsTelegramMobileFlowContextResolved(true);
        if (nextPurpose === 'link') {
          setError(copy.telegramAuthOnlyUnavailable);
        }
      } catch (contextError) {
        if (cancelled) {
          return;
        }
        setTelegramMobileFlowPurpose('');
        setIsTelegramMobileFlowContextResolved(true);
        setIsTelegramMobileFlowContextFailed(true);
        setError(buildTelegramAuthOnlyErrorMessage(contextError, copy));
      }
    };

    void loadTelegramMobileContext();
    return () => {
      cancelled = true;
    };
  }, [copy, normalizedApiBaseUrl, telegramMobileAuthState]);

  useEffect(() => {
    if (
      !isBootstrapComplete
      || !telegramInitData
      || !telegramMobileAuthState
      || !isTelegramMobileFlowContextResolved
      || isTelegramMobileFlowContextFailed
      || isUnsupportedLinkFlow
      || telegramAuthAttempted
    ) {
      return;
    }

    let cancelled = false;
    const watchdogId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setIsTelegramAuthLoading(false);
      setError(copy.telegramAuthOnlyUnavailable);
    }, 12000);

    const loginViaTelegramMiniApp = async () => {
      setTelegramAuthAttempted(true);
      setIsTelegramAuthLoading(true);
      setError('');
      setSuccess('');
      try {
        await requestPublicJSON(
          normalizedApiBaseUrl,
          '/auth/telegram/miniapp/login',
          {
            method: 'POST',
            body: {
              initData: telegramInitData,
              deviceId: getOrCreateLkmDeviceID() || undefined,
              mobileAuthState: telegramMobileAuthState,
            },
          },
        );
        if (cancelled) {
          return;
        }

        const deepLink = buildTelegramMobileReturnLink(telegramMobileAuthState);
        if (!deepLink) {
          throw new Error('TELEGRAM_MOBILE_AUTH_STATE_INVALID');
        }

        setTelegramMobileDeepLink(deepLink);
        setSuccess(copy.telegramAuthOnlyReturning);
        window.setTimeout(() => {
          openMobileReturnLink(deepLink);
        }, 120);
      } catch (loginError) {
        if (cancelled) {
          return;
        }
        setError(buildTelegramAuthOnlyErrorMessage(loginError, copy));
      } finally {
        window.clearTimeout(watchdogId);
        if (!cancelled) {
          setIsTelegramAuthLoading(false);
        }
      }
    };

    void loginViaTelegramMiniApp();
    return () => {
      cancelled = true;
      window.clearTimeout(watchdogId);
    };
  }, [
    copy,
    isBootstrapComplete,
    isTelegramMobileFlowContextFailed,
    isTelegramMobileFlowContextResolved,
    isUnsupportedLinkFlow,
    normalizedApiBaseUrl,
    telegramAuthAttempted,
    telegramInitData,
    telegramMobileAuthState,
  ]);

  return (
    <main className="page-shell auth-only-shell">
      <section className="panel auth-only-panel">
        <div className="panel-heading">
          <h1 className="auth-only-title">{copy.authTitle}</h1>
          {telegramUser ? (
            <div className="tg-user-badge" title={telegramDisplayName || 'Telegram'}>
              {telegramUser.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={telegramUser.photo_url} alt="Telegram avatar" className="tg-avatar" />
              ) : (
                <span className="tg-avatar-fallback">{telegramInitials}</span>
              )}
              <span className="tg-user-label">{telegramDisplayName || 'Telegram'}</span>
            </div>
          ) : null}
        </div>

        {isCheckingTelegramSession ? (
          <p className="note">{copy.telegramAuthOnlyChecking}</p>
        ) : null}
        {success ? <p className="ok">{success}</p> : null}
        {error ? <p className="warn">{error}</p> : null}

        <div className="stack auth-only-actions">
          {telegramMobileReturnLink ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                openMobileReturnLink(telegramMobileReturnLink);
              }}
            >
              {copy.telegramAuthOnlyBackToApp}
            </button>
          ) : null}

          {error ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                window.location.assign(mainPageHref);
              }}
            >
              {copy.telegramAuthOnlyOpenMainPage}
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
