'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  sessionId?: number;
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
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
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
const REFRESH_TOKEN_KEY = 'lkm_refresh_token';
const SESSION_ID_KEY = 'lkm_session_id';
const ACCESS_EXPIRES_AT_KEY = 'lkm_access_expires_at';
const REFRESH_EXPIRES_AT_KEY = 'lkm_refresh_expires_at';
const DEVICE_ID_KEY = 'lkm_device_id';
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
  return 'Неизвестная ошибка';
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

function normalizeSessionID(value: string | null): number | null {
  const parsed = Number(value || '');
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.trunc(parsed);
}

function getOrCreateLkmDeviceID(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)?.trim() || '';
  if (existing) {
    return existing;
  }
  const next = `lkm-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

function sanitizeApiBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.trim().replace(/\\+/g, '/').replace(/\/+$/, '');
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
  const normalizedApiBaseUrl = useMemo(() => sanitizeApiBaseUrl(apiBaseUrl), [apiBaseUrl]);
  const [token, setToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [sessionRestoreAttempted, setSessionRestoreAttempted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);
  const [telegramInitData, setTelegramInitData] = useState('');
  const [telegramUser, setTelegramUser] = useState<TelegramMiniAppUser | null>(null);
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
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const tokenRef = useRef('');
  const refreshTokenRef = useRef('');
  const sessionIdRef = useRef<number | null>(null);
  const deviceIdRef = useRef('');
  const topupChannel = isTelegramMiniApp ? 'bot' : 'web';

  const canTopup = !!token && !isBlockedInApp;

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    deviceIdRef.current = deviceId;
  }, [deviceId]);

  const clearAuthSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
    localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
    setToken('');
    setRefreshToken('');
    setSessionId(null);
    tokenRef.current = '';
    refreshTokenRef.current = '';
    sessionIdRef.current = null;
    refreshPromiseRef.current = null;
  }, []);

  const applyAuthSession = useCallback((payload: LoginResponse): string => {
    const accessToken = (payload.accessToken || payload.token || '').trim();
    if (!accessToken) {
      throw new Error('Не удалось получить access token');
    }

    const normalizedRefreshToken = (payload.refreshToken || '').trim();
    const normalizedSessionID =
      typeof payload.sessionId === 'number' && Number.isFinite(payload.sessionId) && payload.sessionId > 0
        ? Math.trunc(payload.sessionId)
        : null;

    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    tokenRef.current = accessToken;

    if (normalizedRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, normalizedRefreshToken);
      setRefreshToken(normalizedRefreshToken);
      refreshTokenRef.current = normalizedRefreshToken;
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setRefreshToken('');
      refreshTokenRef.current = '';
    }

    if (normalizedSessionID) {
      localStorage.setItem(SESSION_ID_KEY, String(normalizedSessionID));
      setSessionId(normalizedSessionID);
      sessionIdRef.current = normalizedSessionID;
    } else {
      localStorage.removeItem(SESSION_ID_KEY);
      setSessionId(null);
      sessionIdRef.current = null;
    }

    const accessExpiresAt = (payload.accessTokenExpiresAt || '').trim();
    const refreshExpiresAt = (payload.refreshTokenExpiresAt || '').trim();

    if (accessExpiresAt) {
      localStorage.setItem(ACCESS_EXPIRES_AT_KEY, accessExpiresAt);
    } else {
      localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
    }

    if (refreshExpiresAt) {
      localStorage.setItem(REFRESH_EXPIRES_AT_KEY, refreshExpiresAt);
    } else {
      localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
    }

    const resolvedDeviceID = deviceIdRef.current || getOrCreateLkmDeviceID();
    if (resolvedDeviceID && resolvedDeviceID !== deviceIdRef.current) {
      deviceIdRef.current = resolvedDeviceID;
      setDeviceId(resolvedDeviceID);
    }

    return accessToken;
  }, []);

  const refreshAuthSession = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentRefreshToken = refreshTokenRef.current.trim();
    if (!currentRefreshToken) {
      return null;
    }

    const currentSessionID = sessionIdRef.current;
    const currentDeviceID = deviceIdRef.current || getOrCreateLkmDeviceID();
    if (currentDeviceID && currentDeviceID !== deviceIdRef.current) {
      deviceIdRef.current = currentDeviceID;
      setDeviceId(currentDeviceID);
    }

    const refreshPromise = (async () => {
      try {
        const response = await fetch(`${normalizedApiBaseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: currentRefreshToken,
            sessionId: currentSessionID || undefined,
            deviceId: currentDeviceID || undefined,
          }),
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 400 || response.status === 401) {
            clearAuthSession();
          }
          return null;
        }

        const payload = (await response.json()) as LoginResponse;
        return applyAuthSession(payload);
      } catch {
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [normalizedApiBaseUrl, applyAuthSession, clearAuthSession]);

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
    const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)?.trim() || '';
    const savedSessionID = normalizeSessionID(localStorage.getItem(SESSION_ID_KEY));
    const savedDeviceID = getOrCreateLkmDeviceID();
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') || '';
    const normalizedQueryToken = queryToken.trim();
    const bootToken = normalizedQueryToken || savedToken.trim();

    if (savedDeviceID) {
      setDeviceId(savedDeviceID);
      deviceIdRef.current = savedDeviceID;
    }

    if (normalizedQueryToken) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
      localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
      setRefreshToken('');
      refreshTokenRef.current = '';
      setSessionId(null);
      sessionIdRef.current = null;
    } else {
      if (savedRefreshToken) {
        setRefreshToken(savedRefreshToken);
        refreshTokenRef.current = savedRefreshToken;
      }

      if (savedSessionID) {
        setSessionId(savedSessionID);
        sessionIdRef.current = savedSessionID;
      }
    }

    if (bootToken) {
      setToken(bootToken);
      tokenRef.current = bootToken;
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
      const telegramMiniAppUser = telegramWebApp?.initDataUnsafe?.user;
      const telegramLanguageCode = normalizeLanguageCode(telegramMiniAppUser?.language_code);
      if (!telegramInitDataValue) {
        return false;
      }

      setIsTelegramMiniApp(true);
      setTelegramInitData(telegramInitDataValue);
      setTelegramUser(telegramMiniAppUser || null);
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
    if (
      !isTelegramMiniApp ||
      !telegramInitData ||
      token ||
      telegramAuthAttempted ||
      (!!refreshToken && !sessionRestoreAttempted)
    ) {
      return;
    }

    let cancelled = false;
    const watchdogId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setIsTelegramAuthLoading(false);
      setTelegramLinkRequired(true);
      setError('Проверка Telegram заняла слишком много времени. Выполните разовый вход email/пароль для привязки.');
    }, 12000);

    const loginViaTelegramMiniApp = async () => {
      setTelegramAuthAttempted(true);
      setIsTelegramAuthLoading(true);
      setError('');
      setSuccess('');
      try {
        const response = await apiRequest<LoginResponse>('/auth/telegram/miniapp/login', {
          method: 'POST',
          timeoutMs: 10000,
          body: {
            initData: telegramInitData,
            deviceId: deviceIdRef.current || getOrCreateLkmDeviceID(),
          },
          skipAuthRefresh: true,
        });
        applyAuthSession(response);
        if (cancelled) {
          return;
        }
        setSessionRestoreAttempted(true);
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
        } else if (message.includes('TELEGRAM_INIT_DATA_REPLAY')) {
          setTelegramLinkRequired(true);
          setError('Telegram-сессия уже проверена. Выполните разовый вход email/пароль для привязки.');
        } else if (message.includes('TELEGRAM_INIT_DATA_EXPIRED')) {
          setError('Данные Telegram устарели. Закройте Mini App и откройте снова из бота.');
        } else {
          setError(message);
        }
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
  }, [isTelegramMiniApp, telegramInitData, token, telegramAuthAttempted, refreshToken, sessionRestoreAttempted, applyAuthSession]);

  useEffect(() => {
    if (token || !refreshToken || sessionRestoreAttempted) {
      return;
    }

    let cancelled = false;
    setSessionRestoreAttempted(true);

    const restoreSession = async () => {
      const refreshedToken = await refreshAuthSession();
      if (cancelled || !refreshedToken) {
        return;
      }
      setError('');
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [token, refreshToken, sessionRestoreAttempted, refreshAuthSession]);

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

  const regionLabel = region === 'cis' ? 'СНГ' : 'вне СНГ';
  const isTelegramAuthorizedSession = isTelegramMiniApp && !!token;
  const telegramDisplayName = useMemo(() => {
    if (!telegramUser) {
      return '';
    }
    const fullName = `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim();
    if (fullName) {
      return fullName;
    }
    if (telegramUser.username) {
      return `@${telegramUser.username}`;
    }
    if (telegramUser.id) {
      return `ID ${telegramUser.id}`;
    }
    return 'Telegram';
  }, [telegramUser]);
  const telegramInitials = useMemo(() => {
    if (!telegramDisplayName) {
      return 'TG';
    }
    const parts = telegramDisplayName
      .replace(/^@/, '')
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) {
      return 'TG';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [telegramDisplayName]);

  const logout = async () => {
    const currentRefreshToken = refreshTokenRef.current.trim();
    const currentSessionID = sessionIdRef.current;
    if (tokenRef.current && (currentRefreshToken || currentSessionID)) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          token: tokenRef.current,
          skipAuthRefresh: true,
          body: {
            refreshToken: currentRefreshToken || undefined,
            sessionId: currentSessionID || undefined,
            deviceId: deviceIdRef.current || undefined,
          },
        });
      } catch {
        // Logout is best-effort. Local cleanup still proceeds.
      }
    }

    clearAuthSession();
    setSessionRestoreAttempted(false);
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
            deviceId: deviceIdRef.current || getOrCreateLkmDeviceID(),
          }
        : {
            email: email.trim(),
            password,
            deviceId: deviceIdRef.current || getOrCreateLkmDeviceID(),
          };
      const response = await apiRequest<LoginResponse>(
        isTelegramLinkFlow ? '/auth/telegram/miniapp/link' : '/login',
        {
          method: 'POST',
          body: payload,
          skipAuthRefresh: true,
        },
      );
      applyAuthSession(response);
      setSessionRestoreAttempted(true);
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
    return (amount - packages.customMinLkm) % packages.customStepLkm === 0;
  };

  const isValidFixedPackageAmount = (amount: number): boolean => {
    if (!packages) {
      return false;
    }
    return packages.packages.some((item) => item.lkmAmount === amount);
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
    if (selectedAmount && selectedAmount > 0) {
      if (!isValidFixedPackageAmount(selectedAmount)) {
        setError('Выбранный пакет недоступен. Обновите страницу и выберите пакет заново.');
        return;
      }
    } else {
      if (!amountToQuote || !isValidCustomAmount(amountToQuote)) {
        setError(`Введите корректную сумму: ${packages.customMinLkm}..${packages.customMaxLkm}, шаг ${packages.customStepLkm}`);
        return;
      }
    }

    setIsCreatingQuote(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiRequest<QuoteResponse>('/lkm/quote', {
        method: 'POST',
        token,
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
      setSuccess('Расчет сформирован');
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
      setSuccess('Пополнение создано, ожидается оплата через выбранный платежный шлюз');
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
          <span>Платежный шлюз: {gatewayCode}</span>
          <span>Валюта: {currency}</span>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-heading">
            <h2>1. Авторизация</h2>
            {isTelegramMiniApp && telegramUser ? (
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
          {!token && error ? <p className="warn">{error}</p> : null}
          {!token ? (
            isTelegramMiniApp && isTelegramAuthLoading && !telegramLinkRequired ? (
              <div className="stack">
                <p className="note">Проверяем вход через Telegram Mini App...</p>
                <p className="note">Обычно это занимает до 10 секунд.</p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setIsTelegramAuthLoading(false);
                    setTelegramLinkRequired(true);
                    setError('Выберите разовый вход email/пароль для привязки Telegram.');
                  }}
                >
                  Продолжить вручную
                </button>
              </div>
            ) : (
              <form className="stack" onSubmit={onLogin}>
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
                <p className="note">
                  После первого входа сессия сохраняется, повторный вход обычно не требуется.
                </p>
              </form>
            )
          ) : (
            <div className="stack">
              <p className="ok">{isTelegramAuthorizedSession ? 'Авторизовано через Telegram' : 'Авторизовано'}</p>
              <p className="note">Сессия продлевается автоматически, пока действует refresh-сессия.</p>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  void logout();
                }}
              >
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
            <p>
              Номинальный курс:{' '}
              <strong>
                1 LKM = {packages?.nominalRubPerLkm?.toFixed(2) ?? '1.00'} RUB
              </strong>
            </p>
            {!isTelegramAuthorizedSession ? (
              <p className="note">
                Для верификации можно использовать бота: <code>@vedamatch_bot</code>
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>3. Пакеты и произвольная сумма</h2>
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
                Произвольная сумма
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
                Платежный шлюз
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
                Валюта
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
        <h2>4. Расчет и создание пополнения</h2>
        {isBlockedInApp ? (
          <p className="warn">
            Обнаружен встроенный канал приложения. Пополнение в приложении запрещено. Используйте сайт или Telegram-бот.
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
                Расчет действует до: {new Date(quote.quoteExpiresAt).toLocaleString()}
              </p>
              <button type="button" onClick={createTopup} disabled={isCreatingTopup}>
                {isCreatingTopup ? 'Создаем...' : 'Создать пополнение'}
              </button>
            </div>
          ) : null}

          {topup ? (
            <div className="topup-box">
              <p>
                ID пополнения: <code>{topup.topupId}</code>
              </p>
              <p>
                Статус: <strong>{topup.status}</strong> · Риск-маршрут: <strong>{topup.riskAction}</strong>
              </p>
              <p className="note">
                После подтвержденного webhook начисляется ровно {topup.receiveLkm} LKM в кошелек.
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
                  <span className="note">Риск: {item.riskAction}</span>
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
      timeoutMs?: number;
      skipAuthRefresh?: boolean;
    } = {},
  ): Promise<T> {
    const method = options.method || 'GET';
    const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : 0;
    const requestBody = options.body ? JSON.stringify(options.body) : undefined;
    const requestUrl = `${normalizedApiBaseUrl}${path}`;

    const performRequest = async (accessToken: string | undefined) => {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (accessToken) {
        requestHeaders.Authorization = `Bearer ${accessToken}`;
      }

      const controller = new AbortController();
      let timeoutId = 0;
      if (timeoutMs > 0) {
        timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      }

      let response: Response;
      try {
        response = await fetch(requestUrl, {
          method,
          headers: requestHeaders,
          body: requestBody,
          cache: 'no-store',
          signal: controller.signal,
        });
      } catch (fetchError) {
        if (timeoutId > 0) {
          window.clearTimeout(timeoutId);
        }
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          throw new Error(`Запрос превысил таймаут ${Math.round(timeoutMs / 1000)}с`);
        }
        if (fetchError instanceof TypeError) {
          throw new Error(`Сетевая ошибка при обращении к ${requestUrl}`);
        }
        throw fetchError;
      }
      if (timeoutId > 0) {
        window.clearTimeout(timeoutId);
      }

      const raw = await response.text();
      let payload: unknown = {};
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = { error: raw };
        }
      }

      return { response, payload };
    };

    const initialAccessToken = options.token?.trim() || '';
    let { response, payload } = await performRequest(initialAccessToken || undefined);

    const canRetryWithRefresh =
      response.status === 401 &&
      initialAccessToken !== '' &&
      !options.skipAuthRefresh &&
      path !== '/auth/refresh' &&
      path !== '/auth/logout';

    if (canRetryWithRefresh) {
      const refreshedAccessToken = await refreshAuthSession();
      if (refreshedAccessToken) {
        ({ response, payload } = await performRequest(refreshedAccessToken));
      } else {
        clearAuthSession();
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
