'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LKMRegion } from '@/lib/host-config';

type WalletBalance = {
  balance: number;
  bonusBalance: number;
  pendingBalance: number;
  frozenBalance: number;
};

type PackageItem = {
  lkmAmount: number;
  receiveLkm: number;
  totalPayAmount: number;
  payCurrency: string;
  nominalRub: number;
  nominalRubPerLkm: number;
  processingCostRub: number;
};

type PackageResponse = {
  region: LKMRegion;
  currency: string;
  gatewayCode: string;
  paymentMethod: string;
  nominalRubPerLkm: number;
  customMinLkm: number;
  customMaxLkm: number;
  customStepLkm: number;
  packages: PackageItem[];
  disclaimer: string;
};

type QuoteResponse = {
  quoteId: string;
  receiveLkm: number;
  totalPayAmount: number;
  payCurrency: string;
  fxRate: number;
  quoteExpiresAt: string;
  nominalRub: number;
  nominalRubPerLkm: number;
  processingCostRub: number;
  totalRub: number;
  gatewayCode: string;
  paymentMethod: string;
  region: LKMRegion;
  disclaimer: string;
};

type TopupResponse = {
  topupId: string;
  quoteId: string;
  status: string;
  riskAction: string;
  receiveLkm: number;
  totalPayAmount: number;
  payCurrency: string;
  gatewayCode: string;
  paymentMethod: string;
  createdAt: string;
};

type TopupHistoryItem = {
  topupId: string;
  receiveLkm: number;
  totalPayAmount: number;
  payCurrency: string;
  status: string;
  riskAction: string;
  createdAt: string;
};

type TopupHistoryResponse = {
  items: TopupHistoryItem[];
  total: number;
  page: number;
  limit: number;
};

type TopupStatusFilter =
  | 'all'
  | 'pending_payment'
  | 'paid'
  | 'manual_review'
  | 'credited'
  | 'rejected';

type LoginResponse = {
  token?: string;
  accessToken?: string;
  user?: {
    id?: number;
    email?: string;
    spiritualName?: string;
    karmicName?: string;
  };
};

type TelegramMiniAppUser = {
  id?: number;
  language_code?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramMiniAppUser;
  };
  ready?: () => void;
  expand?: () => void;
};

type Props = {
  initialHost: string;
  initialRegion: LKMRegion;
  initialCurrency: string;
  initialGatewayCode: string;
  apiBaseUrl: string;
};

const TOKEN_KEY = 'lkm_access_token';
const HISTORY_PAGE_LIMIT = 8;
const HISTORY_LIMIT_OPTIONS = [8, 20, 50] as const;
const CIS_LANGUAGE_CODES = new Set(['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'hy', 'az', 'mo']);
const HISTORY_STATUS_OPTIONS: ReadonlyArray<TopupStatusFilter> = [
  'all',
  'pending_payment',
  'paid',
  'manual_review',
  'credited',
  'rejected',
];

function normalizeHistoryStatus(value: string | null): TopupStatusFilter {
  if (!value) {
    return 'all';
  }
  if ((HISTORY_STATUS_OPTIONS as ReadonlyArray<string>).includes(value)) {
    return value as TopupStatusFilter;
  }
  return 'all';
}

function normalizeHistoryPage(value: string | null): number {
  const parsed = Number(value || '');
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.trunc(parsed);
}

function normalizeHistoryLimit(value: string | null): number {
  const parsed = Number(value || '');
  if (!Number.isFinite(parsed)) {
    return HISTORY_PAGE_LIMIT;
  }
  const intValue = Math.trunc(parsed);
  if ((HISTORY_LIMIT_OPTIONS as ReadonlyArray<number>).includes(intValue)) {
    return intValue;
  }
  return HISTORY_PAGE_LIMIT;
}

function channelBlockedByUA(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('reactnative') ||
    ua.includes('react-native') ||
    ua.includes('okhttp') ||
    ua.includes('cfnetwork') ||
    ua.includes('vedamatch-app')
  );
}

function buildErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const maybeTelegram = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return maybeTelegram?.WebApp || null;
}

function normalizeLanguageCode(raw: string | undefined): string {
  const value = (raw || '').trim().toLowerCase();
  if (!value) {
    return '';
  }
  const separatorIndex = value.search(/[-_]/);
  if (separatorIndex > 0) {
    return value.slice(0, separatorIndex);
  }
  return value;
}

function resolveMiniAppTargetHost(languageCode: string): string {
  if (CIS_LANGUAGE_CODES.has(normalizeLanguageCode(languageCode))) {
    return 'lkm.vedamatch.ru';
  }
  return 'lkm.vedamatch.com';
}

function isLkmVedamatchHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  return host === 'lkm.vedamatch.ru' || host === 'lkm.vedamatch.com';
}

function humanTopupStatus(status: string): string {
  switch (status) {
    case 'pending_payment':
      return 'Ожидает оплату';
    case 'paid':
      return 'Оплачено';
    case 'manual_review':
      return 'На ручной проверке';
    case 'credited':
      return 'Зачислено';
    case 'rejected':
      return 'Отклонено';
    default:
      return status;
  }
}

export default function LkmCabinetClient({
  initialHost,
  initialRegion,
  initialCurrency,
  initialGatewayCode,
  apiBaseUrl,
}: Props) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState('');
  const [isTelegramAuthLoading, setIsTelegramAuthLoading] = useState(false);
  const [telegramLinkRequired, setTelegramLinkRequired] = useState(false);
  const [telegramAuthAttempted, setTelegramAuthAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [region] = useState<LKMRegion>(initialRegion);
  const [currency, setCurrency] = useState(initialCurrency);
  const [gatewayCode, setGatewayCode] = useState(initialGatewayCode);
  const [paymentMethod, setPaymentMethod] = useState('default');

  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [packages, setPackages] = useState<PackageResponse | null>(null);
  const [topupHistory, setTopupHistory] = useState<TopupHistoryItem[]>([]);
  const [topupHistoryTotal, setTopupHistoryTotal] = useState(0);
  const [historyStatus, setHistoryStatus] = useState<TopupStatusFilter>('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_LIMIT);
  const [historyShareFeedback, setHistoryShareFeedback] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [topup, setTopup] = useState<TopupResponse | null>(null);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [isCreatingTopup, setIsCreatingTopup] = useState(false);
  const [isBlockedInApp, setIsBlockedInApp] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const topupChannel = isTelegramMiniApp ? 'bot' : 'web';

  const canTopup = !!token && !isBlockedInApp;

  const amountToQuote = useMemo(() => {
    if (selectedAmount && selectedAmount > 0) {
      return selectedAmount;
    }
    const parsed = Number(customAmount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return Math.trunc(parsed);
  }, [customAmount, selectedAmount]);

  const historyPages = useMemo(
    () => Math.max(1, Math.ceil(topupHistoryTotal / historyLimit)),
    [topupHistoryTotal, historyLimit],
  );

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || '';
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') || '';
    const bootToken = queryToken || savedToken;

    if (bootToken) {
      setToken(bootToken);
      localStorage.setItem(TOKEN_KEY, bootToken);
    }

    const initialStatus = normalizeHistoryStatus(params.get('historyStatus'));
    const initialPage = normalizeHistoryPage(params.get('historyPage'));
    const initialLimit = normalizeHistoryLimit(params.get('historyLimit'));
    setHistoryStatus(initialStatus);
    setHistoryPage(initialPage);
    setHistoryLimit(initialLimit);

    const bootstrapTelegramContext = () => {
      const telegramWebApp = getTelegramWebApp();
      const telegramInitDataValue = telegramWebApp?.initData?.trim() || '';
      const telegramLanguageCode = normalizeLanguageCode(telegramWebApp?.initDataUnsafe?.user?.language_code);
      if (!telegramInitDataValue) {
        return false;
      }

      setIsTelegramMiniApp(true);
      setTelegramInitData(telegramInitDataValue);
      setIsBlockedInApp(false);

      const currentHost = window.location.hostname.toLowerCase();
      if (isLkmVedamatchHost(currentHost)) {
        const targetHost = resolveMiniAppTargetHost(telegramLanguageCode);
        if (targetHost !== currentHost) {
          const nextURL = new URL(window.location.href);
          nextURL.hostname = targetHost;
          window.location.replace(nextURL.toString());
          return true;
        }
      }

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
      if (bootstrapTelegramContext() || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 250);

    if (channelBlockedByUA(window.navigator.userAgent)) {
      setIsBlockedInApp(true);
    }

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isTelegramMiniApp || !telegramInitData || token || telegramAuthAttempted) {
      return;
    }

    let cancelled = false;
    const loginViaTelegramMiniApp = async () => {
      setTelegramAuthAttempted(true);
      setIsTelegramAuthLoading(true);
      setError('');
      setSuccess('');
      try {
        const response = await apiRequest<LoginResponse>('/auth/telegram/miniapp/login', {
          method: 'POST',
          body: {
            initData: telegramInitData,
            deviceId: `lkm-tg-${Math.random().toString(36).slice(2, 10)}`,
          },
        });
        const accessToken = response.accessToken || response.token;
        if (!accessToken) {
          throw new Error('Не удалось получить access token');
        }
        if (cancelled) {
          return;
        }
        localStorage.setItem(TOKEN_KEY, accessToken);
        setToken(accessToken);
        setTelegramLinkRequired(false);
        setSuccess('Вход через Telegram выполнен');
      } catch (telegramLoginError) {
        if (cancelled) {
          return;
        }
        const message = buildErrorMessage(telegramLoginError);
        if (message.includes('TELEGRAM_LINK_REQUIRED')) {
          setTelegramLinkRequired(true);
          setError('Аккаунт Telegram не привязан. Выполните разовый вход email/пароль для привязки.');
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsTelegramAuthLoading(false);
        }
      }
    };

    void loginViaTelegramMiniApp();
    return () => {
      cancelled = true;
    };
  }, [isTelegramMiniApp, telegramInitData, token, telegramAuthAttempted]);

  useEffect(() => {
    if (!token) {
      setWallet(null);
      setPackages(null);
      setTopupHistory([]);
      setTopupHistoryTotal(0);
      setHistoryStatus('all');
      setHistoryPage(1);
      setHistoryLimit(HISTORY_PAGE_LIMIT);
      setQuote(null);
      setTopup(null);
      return;
    }

    let isCancelled = false;
    const fetchBootstrap = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [walletResponse, packagesResponse] = await Promise.all([
          apiRequest<WalletBalance>('/wallet', { token }),
          apiRequest<PackageResponse>(
            `/lkm/packages?region=${region}&currency=${encodeURIComponent(currency)}&gatewayCode=${encodeURIComponent(gatewayCode)}&paymentMethod=${encodeURIComponent(paymentMethod)}`,
            { token },
          ),
        ]);

        if (!isCancelled) {
          setWallet(walletResponse);
          setPackages(packagesResponse);
          setSelectedAmount((prev) => {
            const available = packagesResponse.packages.map((pkg) => pkg.lkmAmount);
            if (prev && available.includes(prev)) {
              return prev;
            }
            return available[0] ?? null;
          });
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setError(buildErrorMessage(fetchError));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchBootstrap();
    return () => {
      isCancelled = true;
    };
  }, [token, region, currency, gatewayCode, paymentMethod]);

  const fetchTopupHistory = useCallback(
    async (authToken: string, page: number, status: TopupStatusFilter, limit: number) => {
      setIsLoadingHistory(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (status !== 'all') {
          params.set('status', status);
        }
        const response = await apiRequest<TopupHistoryResponse>(`/lkm/topups?${params.toString()}`, {
          token: authToken,
        });
        setTopupHistory(response.items || []);
        setTopupHistoryTotal(response.total || 0);
      } catch (historyError) {
        setError(buildErrorMessage(historyError));
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    void fetchTopupHistory(token, historyPage, historyStatus, historyLimit);
  }, [token, historyPage, historyStatus, historyLimit, fetchTopupHistory]);

  useEffect(() => {
    if (historyPage > historyPages) {
      setHistoryPage(historyPages);
    }
  }, [historyPage, historyPages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('historyStatus', historyStatus);
    params.set('historyPage', String(historyPage));
    params.set('historyLimit', String(historyLimit));
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, [historyStatus, historyPage, historyLimit]);

  const regionLabel = region === 'cis' ? 'CIS / СНГ' : 'non-CIS / Global';

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setEmail('');
    setPassword('');
    setTelegramLinkRequired(false);
    setTelegramAuthAttempted(false);
    setSuccess('');
    setError('');
  };

  const shareHistoryLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      url.searchParams.set('historyStatus', historyStatus);
      url.searchParams.set('historyPage', String(historyPage));
      url.searchParams.set('historyLimit', String(historyLimit));
      const shareUrl = url.toString();

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'История пополнений LKM',
          text: 'Ссылка на текущий фильтр истории пополнений',
          url: shareUrl,
        });
        setHistoryShareFeedback('Ссылка отправлена');
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
        setHistoryShareFeedback('Ссылка скопирована');
      } else {
        setHistoryShareFeedback('Копирование не поддерживается браузером');
      }
    } catch (shareError) {
      const isAbortError = shareError instanceof DOMException && shareError.name === 'AbortError';
      if (!isAbortError) {
        setHistoryShareFeedback('Не удалось поделиться ссылкой');
      }
    } finally {
      window.setTimeout(() => setHistoryShareFeedback(''), 2500);
    }
  };

  const onLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoggingIn(true);
    try {
      const isTelegramLinkFlow = isTelegramMiniApp && telegramLinkRequired && !!telegramInitData;
      const payload = isTelegramLinkFlow
        ? {
            initData: telegramInitData,
            email: email.trim(),
            password,
            deviceId: `lkm-tg-link-${Math.random().toString(36).slice(2, 10)}`,
          }
        : {
            email: email.trim(),
            password,
            deviceId: `lkm-web-${Math.random().toString(36).slice(2, 10)}`,
          };
      const response = await apiRequest<LoginResponse>(
        isTelegramLinkFlow ? '/auth/telegram/miniapp/link' : '/login',
        {
          method: 'POST',
          body: payload,
        },
      );
      const accessToken = response.accessToken || response.token;
      if (!accessToken) {
        throw new Error('Не удалось получить access token');
      }
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      setTelegramLinkRequired(false);
      setSuccess(isTelegramLinkFlow ? 'Telegram успешно привязан и авторизация выполнена' : 'Авторизация успешна');
    } catch (loginError) {
      setError(buildErrorMessage(loginError));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onSelectPackage = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setQuote(null);
    setTopup(null);
    setError('');
    setSuccess('');
  };

  const isValidCustomAmount = (amount: number): boolean => {
    if (!packages) {
      return false;
    }
    if (amount < packages.customMinLkm || amount > packages.customMaxLkm) {
      return false;
    }
    if (packages.customStepLkm <= 1) {
      return true;
    }
    return amount % packages.customStepLkm === 0;
  };

  const onCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setQuote(null);
    setTopup(null);
    setError('');
    setSuccess('');
  };

  const createQuote = async () => {
    if (!canTopup) {
      setError('Пополнение доступно только на web и в Telegram-боте');
      return;
    }
    if (!token) {
      setError('Требуется авторизация');
      return;
    }
    if (!packages) {
      setError('Пакеты не загружены');
      return;
    }
    if (!amountToQuote || !isValidCustomAmount(amountToQuote)) {
      setError(`Введите корректную сумму: ${packages.customMinLkm}..${packages.customMaxLkm}, шаг ${packages.customStepLkm}`);
      return;
    }

    setIsCreatingQuote(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiRequest<QuoteResponse>('/lkm/quote', {
        method: 'POST',
        token,
        headers: {
          'X-Client-Channel': topupChannel,
        },
        body: {
          lkmAmount: amountToQuote,
          gatewayCode,
          paymentMethod,
          region,
          currency,
          channel: topupChannel,
        },
      });
      setQuote(response);
      setTopup(null);
      setSuccess('Quote сформирован');
    } catch (quoteError) {
      setError(buildErrorMessage(quoteError));
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const createTopup = async () => {
    if (!quote) {
      setError('Сначала сформируйте quote');
      return;
    }
    if (!token) {
      setError('Требуется авторизация');
      return;
    }

    setIsCreatingTopup(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiRequest<TopupResponse>('/lkm/topups', {
        method: 'POST',
        token,
        headers: {
          'X-Client-Channel': topupChannel,
        },
        body: {
          quoteId: quote.quoteId,
          channel: topupChannel,
        },
      });
      setTopup(response);
      if (historyPage !== 1) {
        setHistoryPage(1);
      } else {
        try {
          await fetchTopupHistory(token, 1, historyStatus, historyLimit);
        } catch {
          // Top-up creation should not fail because history refresh failed.
        }
      }
      setSuccess('Top-up создан, ожидается оплата через подключенный gateway');
    } catch (topupError) {
      setError(buildErrorMessage(topupError));
    } finally {
      setIsCreatingTopup(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="hero-domain">{initialHost || 'lkm.vedamatch'}</p>
        <h1>Кабинет LKM пополнений</h1>
        <p className="hero-subtitle">
          Пополнение доступно на сайте и в Telegram-боте. В мобильных приложениях кнопки пополнения отключены.
        </p>
        <div className="hero-meta">
          <span>Регион: {regionLabel}</span>
          <span>Gateway: {gatewayCode}</span>
          <span>Валюта: {currency}</span>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h2>1. Авторизация</h2>
          {!token ? (
            <form className="stack" onSubmit={onLogin}>
              {isTelegramMiniApp && isTelegramAuthLoading && !telegramLinkRequired ? (
                <p className="note">Проверяем вход через Telegram Mini App...</p>
              ) : null}
              {isTelegramMiniApp && telegramLinkRequired ? (
                <p className="note">
                  Разовый вход email/пароль нужен, чтобы привязать Telegram к вашему аккаунту VedaMatch.
                </p>
              ) : null}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Пароль
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </label>
              <button type="submit" disabled={isLoggingIn}>
                {isLoggingIn
                  ? telegramLinkRequired && isTelegramMiniApp
                    ? 'Привязываем...'
                    : 'Вход...'
                  : telegramLinkRequired && isTelegramMiniApp
                    ? 'Привязать Telegram'
                    : 'Войти'}
              </button>
            </form>
          ) : (
            <div className="stack">
              <p className="ok">Авторизовано</p>
              <button type="button" className="secondary" onClick={logout}>
                Выйти
              </button>
            </div>
          )}
        </article>

        <article className="panel">
          <h2>2. Баланс и правила</h2>
          <div className="stack">
            <p>
              Текущий активный баланс:{' '}
              <strong>{wallet ? `${wallet.balance} LKM` : '—'}</strong>
            </p>
            <p>Бонусы в MVP: <strong>отключены</strong></p>
            <p>
              Номинальный курс:{' '}
              <strong>
                1 LKM = {packages?.nominalRubPerLkm?.toFixed(2) ?? '1.00'} RUB
              </strong>
            </p>
            <p className="note">
              Для верификации можно использовать bot: <code>@vedamatch_bot</code>
            </p>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>3. Пакеты и custom сумма</h2>
        {isLoading ? <p>Загрузка пакетов...</p> : null}

        {packages ? (
          <>
            <div className="package-grid">
              {packages.packages.map((pkg) => {
                const active = selectedAmount === pkg.lkmAmount;
                return (
                  <button
                    key={pkg.lkmAmount}
                    type="button"
                    className={`package-card ${active ? 'active' : ''}`}
                    onClick={() => onSelectPackage(pkg.lkmAmount)}
                    disabled={!canTopup}
                  >
                    <span className="pkg-amount">{pkg.lkmAmount} LKM</span>
                    <span className="pkg-price">
                      {pkg.totalPayAmount.toFixed(2)} {pkg.payCurrency}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="custom-row">
              <label>
                Custom сумма
                <input
                  type="number"
                  value={customAmount}
                  onChange={(event) => onCustomAmountChange(event.target.value)}
                  placeholder={`${packages.customMinLkm}`}
                  min={packages.customMinLkm}
                  max={packages.customMaxLkm}
                  step={packages.customStepLkm}
                  disabled={!canTopup}
                />
              </label>
              <p className="note">
                Диапазон: {packages.customMinLkm}..{packages.customMaxLkm} LKM, шаг {packages.customStepLkm}
              </p>
            </div>

            <div className="selectors">
              <label>
                Gateway
                <select
                  value={gatewayCode}
                  onChange={(event) => {
                    setGatewayCode(event.target.value);
                    setQuote(null);
                    setTopup(null);
                  }}
                  disabled={!canTopup}
                >
                  <option value="yookassa">yookassa</option>
                  <option value="stripe">stripe</option>
                </select>
              </label>
              <label>
                Currency
                <input
                  value={currency}
                  onChange={(event) => {
                    setCurrency(event.target.value.toUpperCase());
                    setQuote(null);
                    setTopup(null);
                  }}
                  disabled={!canTopup}
                />
              </label>
            </div>
          </>
        ) : (
          <p className="note">После авторизации загрузятся пакеты региона.</p>
        )}
      </section>

      <section className="panel">
        <h2>4. Quote и создание top-up</h2>
        {isBlockedInApp ? (
          <p className="warn">
            Обнаружен in-app/mobile канал. Пополнение в приложении запрещено. Используйте сайт или Telegram-бот.
          </p>
        ) : null}

        <div className="stack">
          <button type="button" onClick={createQuote} disabled={!canTopup || isCreatingQuote}>
            {isCreatingQuote ? 'Считаем...' : 'Получить расчет'}
          </button>

          {quote ? (
            <div className="quote-box">
              <p>
                Вы получите: <strong>{quote.receiveLkm} LKM</strong>
              </p>
              <p>
                Итого к оплате:{' '}
                <strong>
                  {quote.totalPayAmount.toFixed(2)} {quote.payCurrency}
                </strong>
              </p>
              <p className="note">{quote.disclaimer}</p>
              <p className="note">
                Quote действует до: {new Date(quote.quoteExpiresAt).toLocaleString()}
              </p>
              <button type="button" onClick={createTopup} disabled={isCreatingTopup}>
                {isCreatingTopup ? 'Создаем...' : 'Создать top-up'}
              </button>
            </div>
          ) : null}

          {topup ? (
            <div className="topup-box">
              <p>
                Top-up ID: <code>{topup.topupId}</code>
              </p>
              <p>
                Status: <strong>{topup.status}</strong> · Risk route: <strong>{topup.riskAction}</strong>
              </p>
              <p className="note">
                После валидного webhook начисляется ровно {topup.receiveLkm} LKM в кошелек.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2>5. История пополнений</h2>
        {!token ? <p className="note">История доступна после авторизации.</p> : null}

        {token ? (
          <div className="history-toolbar">
            <div className="history-filters">
              <label>
                Статус
                <select
                  value={historyStatus}
                  onChange={(event) => {
                    setHistoryStatus(normalizeHistoryStatus(event.target.value));
                    setHistoryPage(1);
                  }}
                >
                  <option value="all">Все</option>
                  <option value="pending_payment">Ожидает оплату</option>
                  <option value="paid">Оплачено</option>
                  <option value="manual_review">На ручной проверке</option>
                  <option value="credited">Зачислено</option>
                  <option value="rejected">Отклонено</option>
                </select>
              </label>
              <label>
                На странице
                <select
                  value={historyLimit}
                  onChange={(event) => {
                    setHistoryLimit(normalizeHistoryLimit(event.target.value));
                    setHistoryPage(1);
                  }}
                >
                  <option value={8}>8</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <div className="history-pagination">
              <button
                type="button"
                className="secondary"
                onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={isLoadingHistory || historyPage <= 1}
              >
                Назад
              </button>
              <span className="note">
                Страница {historyPage} / {historyPages}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => setHistoryPage((prev) => Math.min(historyPages, prev + 1))}
                disabled={isLoadingHistory || historyPage >= historyPages}
              >
                Вперед
              </button>
            </div>
            <div className="history-actions">
              <button
                type="button"
                className="secondary"
                onClick={shareHistoryLink}
              >
                Поделиться ссылкой
              </button>
              {historyShareFeedback ? (
                <span className="note">{historyShareFeedback}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {token && isLoadingHistory ? <p>Загрузка истории...</p> : null}

        {token && !isLoadingHistory && topupHistory.length === 0 ? (
          <p className="note">Пополнений пока нет.</p>
        ) : null}

        {token && !isLoadingHistory && topupHistory.length > 0 ? (
          <div className="history-list">
            {topupHistory.map((item) => (
              <div key={item.topupId} className="history-row">
                <div className="history-main">
                  <p>
                    <strong>{item.receiveLkm} LKM</strong> · {item.totalPayAmount.toFixed(2)} {item.payCurrency}
                  </p>
                  <p className="note">
                    <code>{item.topupId}</code>
                  </p>
                </div>
                <div className="history-meta">
                  <span className="status-pill">{humanTopupStatus(item.status)}</span>
                  <span className="note">Risk: {item.riskAction}</span>
                  <span className="note">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {token && topupHistoryTotal > 0 ? (
          <p className="note">Всего записей: {topupHistoryTotal}</p>
        ) : null}
      </section>

      {error ? <div className="flash error">{error}</div> : null}
      {success ? <div className="flash success">{success}</div> : null}
    </main>
  );

  async function apiRequest<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      token?: string;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const method = options.method || 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
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
}
