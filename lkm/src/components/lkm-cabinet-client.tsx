'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { LKMRegion } from '@/lib/host-config';
import { formatCabinetCopy, LKM_CABINET_I18N, type CabinetDictionary } from '@/lib/cabinet-i18n';
import {
  LANGUAGE_LABELS,
  LANGUAGE_LOCALES,
  type Language,
} from '@/lib/tariffs-i18n';
import {
  getLanguageFromSearch,
  resolveTariffsLanguage,
  saveTariffsLanguage,
} from '@/lib/tariffs-language';

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

type ProPlan = {
  code: string;
  days: number;
  priceLkm: number;
  title?: string;
  badge?: string;
  isPopular?: boolean;
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

type SocialAuthConfigResponse = {
  google?: {
    enabled?: boolean;
    clientId?: string;
  };
  vk?: {
    enabled?: boolean;
  };
};

type SocialAuthPopupMessage = {
  source?: string;
  provider?: 'vk';
  status?: 'success' | 'error';
  error?: string;
  authPayload?: LoginResponse;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityAPI = {
  accounts?: {
    id?: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: 'popup' | 'redirect';
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        context?: 'signin' | 'signup' | 'use';
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          text?: string;
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          width?: number;
          logo_alignment?: 'left' | 'center';
        },
      ) => void;
      cancel?: () => void;
    };
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

type TelegramLaunchParams = {
  initData: string;
  startParam: string;
  user: TelegramMiniAppUser | null;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramMiniAppUser;
    start_param?: string;
  };
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  openLink?: (
    url: string,
    options?: {
      try_browser?: 'external' | 'chrome' | 'safari';
      try_instant_view?: boolean;
    },
  ) => void;
};

type Props = {
  initialHost: string;
  initialRegion: LKMRegion;
  initialCurrency: string;
  initialGatewayCode: string;
  apiBaseUrl: string;
};

declare global {
  interface Window {
    google?: GoogleIdentityAPI;
  }
}

const TOKEN_KEY = 'lkm_access_token';
const REFRESH_TOKEN_KEY = 'lkm_refresh_token';
const SESSION_ID_KEY = 'lkm_session_id';
const ACCESS_EXPIRES_AT_KEY = 'lkm_access_expires_at';
const REFRESH_EXPIRES_AT_KEY = 'lkm_refresh_expires_at';
const DEVICE_ID_KEY = 'lkm_device_id';
const TELEGRAM_LAUNCH_PARAMS_KEY = 'lkm_telegram_launch_params';
const HISTORY_PAGE_LIMIT = 8;
const HISTORY_LIMIT_OPTIONS = [8, 20, 50] as const;
const CIS_LANGUAGE_CODES = new Set(['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'hy', 'az', 'mo']);
const SOCIAL_AUTH_POPUP_SOURCE = 'vedamatch:lkm-social-auth';
const VK_WEB_REDIRECT_URI_HINT = 'https://api.vedamatch.ru/auth/vk/web/callback';
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

function buildErrorMessage(error: unknown, copy: CabinetDictionary): string {
  if (error instanceof Error) {
    const message = error.message || '';
    if (message.includes('TELEGRAM_ALREADY_LINKED')) {
      return copy.errorTelegramAlreadyLinked;
    }
    if (message.includes('TELEGRAM_LINK_CONFLICT')) {
      return copy.errorTelegramConflict;
    }
    if (message.includes('TELEGRAM_LINK_REQUIRED')) {
      return copy.errorTelegramRequired;
    }
    return message;
  }
  return copy.errorUnknown;
}

function buildSocialPopupErrorMessage(
  provider: 'vk',
  rawError: string | undefined,
  copy: CabinetDictionary,
): string {
  const normalized = (rawError || '').trim();
  if (!normalized) {
    return provider === 'vk' ? copy.errorSocialLoginVK : copy.errorSocialLoginGeneric;
  }
  if (normalized === 'access_denied') {
    return copy.errorSocialVKCancelled;
  }
  if (normalized === 'exchange_failed') {
    return copy.errorSocialVKExchange;
  }
  if (normalized === 'missing_code') {
    return copy.errorSocialVKMissingCode;
  }
  if (normalized === 'Invalid VK token') {
    return copy.errorSocialVKInvalidToken;
  }
  return normalized;
}

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const maybeTelegram = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
  return maybeTelegram?.WebApp || null;
}

function parseTelegramMiniAppUser(raw: string | null | undefined): TelegramMiniAppUser | null {
  const normalized = (raw || '').trim();
  if (!normalized) {
    return null;
  }
  try {
    const parsed = JSON.parse(normalized) as TelegramMiniAppUser;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function readTelegramParams(raw: string): URLSearchParams {
  const normalized = raw.startsWith('?') || raw.startsWith('#') ? raw.slice(1) : raw;
  return new URLSearchParams(normalized);
}

function extractTelegramLaunchParamsFromLocation(location: Location): TelegramLaunchParams {
  const hashParams = readTelegramParams(location.hash);
  const searchParams = readTelegramParams(location.search);
  const initData = (
    hashParams.get('tgWebAppData')?.trim()
    || searchParams.get('tgWebAppData')?.trim()
    || ''
  );
  const startParam = (
    hashParams.get('tgWebAppStartParam')?.trim()
    || searchParams.get('tgWebAppStartParam')?.trim()
    || searchParams.get('startapp')?.trim()
    || searchParams.get('startattach')?.trim()
    || ''
  );
  return {
    initData,
    startParam,
    user: parseTelegramMiniAppUser(readTelegramParams(initData).get('user')),
  };
}

function readSavedTelegramLaunchParams(): TelegramLaunchParams {
  if (typeof window === 'undefined') {
    return { initData: '', startParam: '', user: null };
  }
  try {
    const raw = window.sessionStorage.getItem(TELEGRAM_LAUNCH_PARAMS_KEY) || '';
    if (!raw) {
      return { initData: '', startParam: '', user: null };
    }
    const parsed = JSON.parse(raw) as Partial<TelegramLaunchParams>;
    return {
      initData: typeof parsed?.initData === 'string' ? parsed.initData.trim() : '',
      startParam: typeof parsed?.startParam === 'string' ? parsed.startParam.trim() : '',
      user: parsed?.user && typeof parsed.user === 'object' ? parsed.user as TelegramMiniAppUser : null,
    };
  } catch {
    return { initData: '', startParam: '', user: null };
  }
}

function persistTelegramLaunchParams(params: TelegramLaunchParams): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(TELEGRAM_LAUNCH_PARAMS_KEY, JSON.stringify({
      initData: params.initData,
      startParam: params.startParam,
      user: params.user,
    }));
  } catch {
    // Ignore storage quota/unavailability and continue with in-memory flow.
  }
}

function openMobileReturnLink(url: string): void {
  const target = url.trim();
  if (!target || typeof window === 'undefined') {
    return;
  }

  const telegramWebApp = getTelegramWebApp();
  if (telegramWebApp?.openLink) {
    try {
      telegramWebApp.openLink(target, {
        try_browser: 'external',
        try_instant_view: false,
      });
      return;
    } catch {
      try {
        telegramWebApp.openLink(target, {
          try_instant_view: false,
        });
        return;
      } catch {
        // Fall through to browser-level navigation if Telegram WebApp API rejects the call.
      }
    }
  }

  try {
    const popup = window.open(target, '_blank', 'noopener,noreferrer');
    if (popup) {
      return;
    }
  } catch {
    // Ignore popup-blocker or unsupported window.open and fall back to same-tab navigation.
  }

  window.location.replace(target);
}

function buildTelegramMobileReturnLink(state: string): string {
  const normalizedState = state.trim();
  if (!normalizedState) {
    return '';
  }

  const params = new URLSearchParams();
  params.set('state', normalizedState);
  return `https://api.vedamatch.ru/auth/telegram/callback?${params.toString()}`;
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

function extractTelegramMobileAuthStateFromStartParam(raw: string | null | undefined): string {
  const value = (raw || '').trim();
  if (!value.startsWith('vm_auth_')) {
    return '';
  }
  return value.slice('vm_auth_'.length).trim();
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

function humanTopupStatus(status: string, copy: CabinetDictionary): string {
  switch (status) {
    case 'pending_payment':
      return copy.statusLabels.pending_payment;
    case 'paid':
      return copy.statusLabels.paid;
    case 'manual_review':
      return copy.statusLabels.manual_review;
    case 'credited':
      return copy.statusLabels.credited;
    case 'rejected':
      return copy.statusLabels.rejected;
    default:
      return status;
  }
}

const IconGlobe = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const IconLock = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const IconWallet = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>;
const IconZap = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const IconCalculator = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>;
const IconHistory = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

export default function LkmCabinetClient({
  initialHost,
  initialRegion,
  initialCurrency,
  initialGatewayCode,
  apiBaseUrl,
}: Props) {
  const normalizedApiBaseUrl = useMemo(() => sanitizeApiBaseUrl(apiBaseUrl), [apiBaseUrl]);
  const [language, setLanguage] = useState<Language>('en');
  const copy = useMemo(() => LKM_CABINET_I18N[language], [language]);
  const locale = LANGUAGE_LOCALES[language];
  const apiOrigin = useMemo(() => {
    try {
      return new URL(normalizedApiBaseUrl).origin;
    } catch {
      return '';
    }
  }, [normalizedApiBaseUrl]);
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
  const [telegramMobileAuthState, setTelegramMobileAuthState] = useState('');
  const [telegramMobileFlowPurpose, setTelegramMobileFlowPurpose] = useState('');
  const [isTelegramAuthLoading, setIsTelegramAuthLoading] = useState(false);
  const [isTelegramMobileBridgeLoading, setIsTelegramMobileBridgeLoading] = useState(false);
  const [telegramMobileDeepLink, setTelegramMobileDeepLink] = useState('');
  const [telegramLinkRequired, setTelegramLinkRequired] = useState(false);
  const [telegramAuthAttempted, setTelegramAuthAttempted] = useState(false);
  const [socialAuthConfig, setSocialAuthConfig] = useState<SocialAuthConfigResponse | null>(null);
  const [isSocialAuthConfigLoading, setIsSocialAuthConfigLoading] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [isVKAuthLoading, setIsVKAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [region] = useState<LKMRegion>(initialRegion);
  const [currency, setCurrency] = useState(initialCurrency);
  const [gatewayCode, setGatewayCode] = useState(initialGatewayCode);
  const [paymentMethod, setPaymentMethod] = useState('default');

  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [proPlans, setProPlans] = useState<ProPlan[]>([]);
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
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const socialAuthPopupRef = useRef<Window | null>(null);
  const socialAuthPopupPollRef = useRef<number | null>(null);
  const socialAuthPopupResolvedRef = useRef(false);
  const topupChannel = isTelegramMiniApp ? 'bot' : 'web';
  const isTelegramMobileAuthFlow = telegramMobileAuthState !== '';
  const isTelegramMobileLinkFlow = telegramMobileFlowPurpose === 'link';
  const telegramMobileReturnLink = useMemo(() => {
    const explicitLink = telegramMobileDeepLink.trim();
    if (explicitLink) {
      return explicitLink;
    }
    if (!isTelegramMobileAuthFlow) {
      return '';
    }
    return buildTelegramMobileReturnLink(telegramMobileAuthState);
  }, [isTelegramMobileAuthFlow, telegramMobileAuthState, telegramMobileDeepLink]);
  const canUseWebSocialAuth = !isTelegramMiniApp && !telegramLinkRequired;
  const googleClientId = (socialAuthConfig?.google?.clientId || '').trim();
  const canUseGoogleWebAuth = canUseWebSocialAuth && !!socialAuthConfig?.google?.enabled && googleClientId !== '';
  const canUseVKWebAuth = canUseWebSocialAuth && !!socialAuthConfig?.vk?.enabled;
  const showSocialAuthOptions = !token && canUseWebSocialAuth && (canUseGoogleWebAuth || canUseVKWebAuth || isSocialAuthConfigLoading);

  const canTopup = !!token && !isBlockedInApp;
  const formatNumber = useCallback((value: number, digits = 2) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }, [locale]);
  const getProPlanDisplayTitle = useCallback((plan: ProPlan) => {
    return `PRO ${formatCabinetCopy(copy.proPreviewDaysTemplate, { days: plan.days })}`;
  }, [copy.proPreviewDaysTemplate]);
  const setLanguageInUrl = useCallback((nextLanguage: Language) => {
    saveTariffsLanguage(nextLanguage);
    if (typeof window === 'undefined') {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('lang', nextLanguage);
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (!telegramMobileAuthState) {
      setTelegramMobileFlowPurpose('');
      return;
    }

    let cancelled = false;
    const loadTelegramMobileContext = async () => {
      try {
        const response = await apiRequest<{ purpose?: string }>(
          `/auth/telegram/mobile/state/${encodeURIComponent(telegramMobileAuthState)}`,
          {
            method: 'GET',
            skipAuthRefresh: true,
          },
        );
        if (!cancelled) {
          setTelegramMobileFlowPurpose((response.purpose || '').trim());
        }
      } catch {
        if (!cancelled) {
          setTelegramMobileFlowPurpose('');
        }
      }
    };

    void loadTelegramMobileContext();
    return () => {
      cancelled = true;
    };
  }, [telegramMobileAuthState]);

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
      throw new Error(copy.errorAccessTokenMissing);
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
  }, [copy.errorAccessTokenMissing]);

  const performPublicSocialLogin = useCallback(async (path: string, body: unknown): Promise<LoginResponse> => {
    const response = await fetch(`${normalizedApiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

    return payload as LoginResponse;
  }, [normalizedApiBaseUrl]);

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

  const completeTelegramMobileBridge = useCallback(async (): Promise<boolean> => {
    if (!isTelegramMobileAuthFlow || !telegramMobileAuthState) {
      return false;
    }

    setIsTelegramMobileBridgeLoading(true);
    setTelegramMobileDeepLink('');
    setError('');
    try {
      const deepLink = buildTelegramMobileReturnLink(telegramMobileAuthState);
      if (!deepLink) {
        throw new Error(copy.errorPrepareAppReturn);
      }

      setTelegramMobileDeepLink(deepLink);
      setSuccess(copy.successReturningToApp);
      window.setTimeout(() => {
        openMobileReturnLink(deepLink);
      }, 120);
      return true;
    } catch (bridgeError) {
      setError(buildErrorMessage(bridgeError, copy));
      return false;
    } finally {
      setIsTelegramMobileBridgeLoading(false);
    }
  }, [copy, isTelegramMobileAuthFlow, telegramMobileAuthState]);

  const finalizeSocialLogin = useCallback(async (authPayload: LoginResponse, providerLabel: string) => {
    applyAuthSession(authPayload);
    setSessionRestoreAttempted(true);
    setError('');
    if (isTelegramMobileAuthFlow) {
      await completeTelegramMobileBridge();
    } else {
      setSuccess(formatCabinetCopy(copy.successLoginViaProviderTemplate, { provider: providerLabel }));
    }
  }, [applyAuthSession, completeTelegramMobileBridge, copy, isTelegramMobileAuthFlow]);

  const handleGoogleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    const idToken = (response.credential || '').trim();
    if (!idToken) {
      setError(copy.errorGoogleMissingToken);
      return;
    }

    const resolvedDeviceID = deviceIdRef.current || getOrCreateLkmDeviceID();
    if (resolvedDeviceID && resolvedDeviceID !== deviceIdRef.current) {
      deviceIdRef.current = resolvedDeviceID;
      setDeviceId(resolvedDeviceID);
    }

    setError('');
    setSuccess('');
    setIsGoogleAuthLoading(true);
    try {
      const authPayload = await performPublicSocialLogin('/auth/google/login', {
        idToken,
        deviceId: resolvedDeviceID || undefined,
      });
      await finalizeSocialLogin(authPayload, 'Google');
    } catch (googleError) {
      setError(buildErrorMessage(googleError, copy));
    } finally {
      setIsGoogleAuthLoading(false);
    }
  }, [copy, finalizeSocialLogin, performPublicSocialLogin]);

  const openVKWebPopup = useCallback(() => {
    if (!socialAuthConfig?.vk?.enabled) {
      setError(copy.errorVKNotConfigured);
      return;
    }

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    if (!currentOrigin) {
      setError(copy.errorOriginMissing);
      return;
    }

    const resolvedDeviceID = deviceIdRef.current || getOrCreateLkmDeviceID();
    if (resolvedDeviceID && resolvedDeviceID !== deviceIdRef.current) {
      deviceIdRef.current = resolvedDeviceID;
      setDeviceId(resolvedDeviceID);
    }

    setError('');
    setSuccess('');
    setIsVKAuthLoading(true);

    const startURL = `${normalizedApiBaseUrl}/auth/vk/web/start?origin=${encodeURIComponent(currentOrigin)}&deviceId=${encodeURIComponent(resolvedDeviceID || '')}`;
    const width = 560;
    const height = 720;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const popup = window.open(startURL, 'vedamatch-vk-login', features);

    if (!popup) {
      setIsVKAuthLoading(false);
      setError(copy.errorVKPopupBlocked);
      return;
    }

    socialAuthPopupRef.current = popup;
    socialAuthPopupResolvedRef.current = false;
    popup.focus();

    if (socialAuthPopupPollRef.current) {
      window.clearInterval(socialAuthPopupPollRef.current);
    }
    socialAuthPopupPollRef.current = window.setInterval(() => {
      const currentPopup = socialAuthPopupRef.current;
      if (!currentPopup || currentPopup.closed) {
        if (socialAuthPopupPollRef.current) {
          window.clearInterval(socialAuthPopupPollRef.current);
          socialAuthPopupPollRef.current = null;
        }
        if (!socialAuthPopupResolvedRef.current) {
          setError(formatCabinetCopy(copy.errorVKPopupClosedTemplate, { uri: VK_WEB_REDIRECT_URI_HINT }));
        }
        socialAuthPopupRef.current = null;
        setIsVKAuthLoading(false);
      }
    }, 400);
  }, [copy, normalizedApiBaseUrl, socialAuthConfig?.vk?.enabled]);

  useEffect(() => {
    if (token || isTelegramMiniApp) {
      return;
    }

    let cancelled = false;
    setIsSocialAuthConfigLoading(true);
    fetch(`${normalizedApiBaseUrl}/auth/social/config`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json()) as SocialAuthConfigResponse;
        if (!response.ok) {
          throw new Error(copy.errorSocialConfigLoad);
        }
        if (!cancelled) {
          setSocialAuthConfig(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSocialAuthConfig(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSocialAuthConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.errorSocialConfigLoad, isTelegramMiniApp, normalizedApiBaseUrl, token]);

  useEffect(() => {
    if (!apiOrigin) {
      return;
    }

    const handleSocialPopupMessage = (event: MessageEvent<SocialAuthPopupMessage>) => {
      if (event.origin !== apiOrigin) {
        return;
      }
      const message = event.data;
      if (!message || message.source !== SOCIAL_AUTH_POPUP_SOURCE || message.provider !== 'vk') {
        return;
      }

      if (socialAuthPopupPollRef.current) {
        window.clearInterval(socialAuthPopupPollRef.current);
        socialAuthPopupPollRef.current = null;
      }
      if (socialAuthPopupRef.current && !socialAuthPopupRef.current.closed) {
        socialAuthPopupRef.current.close();
      }
      socialAuthPopupRef.current = null;
      socialAuthPopupResolvedRef.current = true;
      setIsVKAuthLoading(false);

      if (message.status === 'success' && message.authPayload) {
        void finalizeSocialLogin(message.authPayload, 'VK');
        return;
      }

      setError(buildSocialPopupErrorMessage('vk', message.error, copy));
    };

    window.addEventListener('message', handleSocialPopupMessage);
    return () => {
      window.removeEventListener('message', handleSocialPopupMessage);
    };
  }, [apiOrigin, copy, finalizeSocialLogin]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${normalizedApiBaseUrl}/pro/plans`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }
        const payload = (await response.json()) as { plans?: ProPlan[] };
        if (!cancelled) {
          const plans = Array.isArray(payload.plans) ? payload.plans : [];
          setProPlans(plans.slice().sort((a, b) => a.days - b.days));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProPlans([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedApiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!canUseWebSocialAuth || token) {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
      return;
    }

    const googleClientId = (socialAuthConfig?.google?.clientId || '').trim();
    if (!socialAuthConfig?.google?.enabled || !googleClientId || !googleButtonRef.current) {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current) {
        return;
      }
      const googleIdentity = window.google?.accounts?.id;
      if (!googleIdentity) {
        return;
      }

      googleIdentity.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void handleGoogleCredentialResponse(response);
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
      });
      googleButtonRef.current.innerHTML = '';
      googleIdentity.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: 320,
        logo_alignment: 'left',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', renderGoogleButton, { once: true });
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.addEventListener('load', renderGoogleButton, { once: true });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [canUseWebSocialAuth, handleGoogleCredentialResponse, socialAuthConfig, token]);

  useEffect(() => () => {
    if (socialAuthPopupPollRef.current) {
      window.clearInterval(socialAuthPopupPollRef.current);
      socialAuthPopupPollRef.current = null;
    }
    if (socialAuthPopupRef.current && !socialAuthPopupRef.current.closed) {
      socialAuthPopupRef.current.close();
      socialAuthPopupRef.current = null;
    }
  }, []);

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
    const resolvedLanguage = resolveTariffsLanguage();
    const queryToken = params.get('token') || '';
    const normalizedQueryToken = queryToken.trim();
    const bootToken = normalizedQueryToken || savedToken.trim();

    setLanguage(resolvedLanguage);
    if (!getLanguageFromSearch(window.location.search)) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', resolvedLanguage);
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
    }

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
      const locationLaunchParams = extractTelegramLaunchParamsFromLocation(window.location);
      const savedLaunchParams = readSavedTelegramLaunchParams();
      const telegramInitDataValue = (
        telegramWebApp?.initData?.trim()
        || locationLaunchParams.initData
        || savedLaunchParams.initData
      );
      const telegramMiniAppUser = (
        telegramWebApp?.initDataUnsafe?.user
        || locationLaunchParams.user
        || savedLaunchParams.user
      );
      const telegramStartParam = (
        telegramWebApp?.initDataUnsafe?.start_param?.trim()
        || locationLaunchParams.startParam
        || savedLaunchParams.startParam
      );
      const telegramMobileState = extractTelegramMobileAuthStateFromStartParam(telegramStartParam);
      const telegramLanguageCode = normalizeLanguageCode(telegramMiniAppUser?.language_code);
      if (!telegramInitDataValue) {
        return false;
      }

      // Telegram documents that launch params may arrive in the URL hash.
      // Persist them immediately so auth survives redirects/reloads inside the Mini App.
      persistTelegramLaunchParams({
        initData: telegramInitDataValue,
        startParam: telegramStartParam,
        user: telegramMiniAppUser || null,
      });

      setIsTelegramMiniApp(true);
      setTelegramInitData(telegramInitDataValue);
      setTelegramUser(telegramMiniAppUser || null);
      setIsBlockedInApp(false);
      setTelegramMobileDeepLink('');

      if (telegramMobileState) {
        setTelegramMobileAuthState(telegramMobileState);
        clearAuthSession();
      } else {
        setTelegramMobileAuthState('');
      }

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
      telegramAuthAttempted ||
      (token && !isTelegramMobileAuthFlow) ||
      (!!refreshToken && !sessionRestoreAttempted && !isTelegramMobileAuthFlow)
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
      setError(copy.errorTelegramAuthTimeout);
    }, 12000);

    const loginViaTelegramMiniApp = async () => {
      setTelegramAuthAttempted(true);
      setIsTelegramAuthLoading(true);
      setError('');
      setSuccess('');
      try {
        if (isTelegramMobileLinkFlow && isTelegramMobileAuthFlow) {
          await apiRequest<{ message: string }>('/auth/telegram/miniapp/mobile-link', {
            method: 'POST',
            timeoutMs: 10000,
            body: {
              initData: telegramInitData,
              mobileAuthState: telegramMobileAuthState,
            },
            skipAuthRefresh: true,
          });
          if (cancelled) {
            return;
          }
          setTelegramLinkRequired(false);
          await completeTelegramMobileBridge();
          return;
        }

        const response = await apiRequest<LoginResponse>('/auth/telegram/miniapp/login', {
          method: 'POST',
          timeoutMs: 10000,
          body: {
            initData: telegramInitData,
            deviceId: deviceIdRef.current || getOrCreateLkmDeviceID(),
            mobileAuthState: telegramMobileAuthState || undefined,
          },
          skipAuthRefresh: true,
        });
        applyAuthSession(response);
        if (cancelled) {
          return;
        }
        setSessionRestoreAttempted(true);
        setTelegramLinkRequired(false);
        if (isTelegramMobileAuthFlow) {
          await completeTelegramMobileBridge();
        } else {
        setSuccess(copy.successTelegramLogin);
        }
      } catch (telegramLoginError) {
        if (cancelled) {
          return;
        }
        const message = buildErrorMessage(telegramLoginError, copy);
        if (message.includes('TELEGRAM_LINK_REQUIRED')) {
          setTelegramLinkRequired(true);
          setError(copy.errorTelegramRequired);
        } else if (message.includes('TELEGRAM_LINK_CONFLICT')) {
          setError(copy.errorTelegramConflict);
        } else if (message.includes('TELEGRAM_INIT_DATA_REPLAY')) {
          setTelegramLinkRequired(true);
          setError(copy.errorTelegramSessionChecked);
        } else if (message.includes('TELEGRAM_INIT_DATA_EXPIRED')) {
          setError(copy.errorTelegramDataExpired);
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
  }, [
    isTelegramMiniApp,
    telegramInitData,
    token,
    telegramAuthAttempted,
    refreshToken,
    sessionRestoreAttempted,
    applyAuthSession,
    completeTelegramMobileBridge,
    isTelegramMobileAuthFlow,
    isTelegramMobileLinkFlow,
    telegramMobileAuthState,
    telegramMobileFlowPurpose,
  ]);

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
          setError(buildErrorMessage(fetchError, copy));
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
        setError(buildErrorMessage(historyError, copy));
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [copy],
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

  const regionLabel = region === 'cis' ? copy.regionCis : copy.regionNonCis;
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
      url.searchParams.set('lang', language);
      url.searchParams.set('historyStatus', historyStatus);
      url.searchParams.set('historyPage', String(historyPage));
      url.searchParams.set('historyLimit', String(historyLimit));
      const shareUrl = url.toString();

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: copy.shareTitle,
          text: copy.shareText,
          url: shareUrl,
        });
        setHistoryShareFeedback(copy.shareSent);
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
        setHistoryShareFeedback(copy.shareCopied);
      } else {
        setHistoryShareFeedback(copy.shareUnsupported);
      }
    } catch (shareError) {
      const isAbortError = shareError instanceof DOMException && shareError.name === 'AbortError';
      if (!isAbortError) {
        setHistoryShareFeedback(copy.shareFailed);
      }
    } finally {
      window.setTimeout(() => setHistoryShareFeedback(''), 2500);
    }
  };

  const onLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(copy.errorEnterEmailPassword);
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
          mobileAuthState: telegramMobileAuthState || undefined,
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
      if (isTelegramMobileAuthFlow) {
        await completeTelegramMobileBridge();
      } else {
        setSuccess(isTelegramLinkFlow ? copy.successTelegramLinked : copy.successAuthorized);
      }
    } catch (loginError) {
      setError(buildErrorMessage(loginError, copy));
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
      setError(copy.errorTopupOnlyWeb);
      return;
    }
    if (!token) {
      setError(copy.errorAuthRequired);
      return;
    }
    if (!packages) {
      setError(copy.errorPackagesNotLoaded);
      return;
    }
    if (selectedAmount && selectedAmount > 0) {
      if (!isValidFixedPackageAmount(selectedAmount)) {
        setError(copy.errorPackageUnavailable);
        return;
      }
    } else {
      if (!amountToQuote || !isValidCustomAmount(amountToQuote)) {
        setError(formatCabinetCopy(copy.errorInvalidAmountTemplate, {
          min: packages.customMinLkm,
          max: packages.customMaxLkm,
          step: packages.customStepLkm,
        }));
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
      setSuccess(copy.successQuoteCreated);
    } catch (quoteError) {
      setError(buildErrorMessage(quoteError, copy));
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const createTopup = async () => {
    if (!quote) {
      setError(copy.errorCreateQuoteFirst);
      return;
    }
    if (!token) {
      setError(copy.errorAuthRequired);
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
      setSuccess(copy.successTopupCreated);
    } catch (topupError) {
      setError(buildErrorMessage(topupError, copy));
    } finally {
      setIsCreatingTopup(false);
    }
  };

  const onLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setLanguageInUrl(nextLanguage);
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="hero-domain"><IconGlobe /> {initialHost || 'lkm.vedamatch'}</p>
        <h1>{copy.heroTitle}</h1>
        <p className="hero-subtitle">
          {copy.heroSubtitle}
        </p>
        <div className="hero-actions hero-actions-row">
          <Link href={`/tariffs?lang=${language}`} className="secondary hero-action-link">
            {copy.tariffsLink}
          </Link>
          <label className="hero-language-picker">
            <span>{copy.languageLabel}</span>
            <select
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
            >
              <option value="ru">{LANGUAGE_LABELS.ru}</option>
              <option value="en">{LANGUAGE_LABELS.en}</option>
              <option value="hi">{LANGUAGE_LABELS.hi}</option>
            </select>
          </label>
        </div>
        <div className="hero-meta">
          <span>{copy.regionLabel}: {regionLabel}</span>
          <span>{copy.gatewayLabel}: {gatewayCode}</span>
          <span>{copy.currencyLabel}: {currency}</span>
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="panel-heading">
            <h2><IconLock /> {copy.authTitle}</h2>
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
                <p className="note">
                  {isTelegramMobileAuthFlow
                    ? copy.authCheckingTelegramReturn
                    : copy.authCheckingTelegramMiniApp}
                </p>
                <p className="note">{copy.authUsuallyTakes}</p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setIsTelegramAuthLoading(false);
                    setTelegramLinkRequired(true);
                    setError(copy.errorTelegramRequired);
                  }}
                >
                  {copy.continueManually}
                </button>
              </div>
            ) : (
              <form className="stack" onSubmit={onLogin}>
                {isTelegramMiniApp && telegramLinkRequired ? (
                  <p className="note">
                    {isTelegramMobileAuthFlow
                      ? copy.authLinkNoteMobile
                      : copy.authLinkNote}
                  </p>
                ) : null}
                {showSocialAuthOptions ? (
                  <div className="social-auth-stack">
                    <p className="note">
                      {copy.authSocialHint}
                    </p>
                    {canUseGoogleWebAuth ? (
                      <div className="google-auth-slot-wrap">
                        <div
                          ref={googleButtonRef}
                          className={`google-auth-slot${isGoogleAuthLoading ? ' is-loading' : ''}`}
                          aria-live="polite"
                        />
                        {isGoogleAuthLoading ? (
                          <p className="note">{copy.authGooglePending}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {canUseVKWebAuth ? (
                      <button
                        type="button"
                        className="secondary social-auth-button vk-auth-button"
                        onClick={openVKWebPopup}
                        disabled={isVKAuthLoading || isGoogleAuthLoading || isLoggingIn}
                      >
                        {isVKAuthLoading ? 'VK...' : copy.authLoginWithVK}
                      </button>
                    ) : null}
                    <div className="social-auth-divider" aria-hidden="true">
                      <span>{copy.authOr}</span>
                    </div>
                  </div>
                ) : null}
                <label>
                  {copy.emailLabel}
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={copy.emailPlaceholder}
                  />
                </label>
                <label>
                  {copy.passwordLabel}
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.passwordPlaceholder}
                  />
                </label>
                <button type="submit" disabled={isLoggingIn}>
                  {isLoggingIn
                    ? telegramLinkRequired && isTelegramMiniApp
                      ? isTelegramMobileAuthFlow
                        ? copy.authVerifying
                        : copy.authLinkingTelegram
                      : copy.authLoggingIn
                    : telegramLinkRequired && isTelegramMiniApp
                      ? copy.authLinkTelegram
                      : copy.authLogin}
                </button>
                <p className="note">
                  {copy.authSessionAutoRefresh}
                </p>
              </form>
            )
          ) : (
            <div className="stack">
              <p className="ok">
                {isTelegramMobileAuthFlow
                  ? copy.authReturningToApp
                  : isTelegramAuthorizedSession
                    ? copy.authAuthorizedTelegram
                    : copy.authAuthorized}
              </p>
              <p className="note">
                {isTelegramMobileAuthFlow
                  ? isTelegramMobileBridgeLoading
                    ? copy.authReturningToApp
                    : copy.authReturnHint
                  : copy.authSessionAutoRefresh}
              </p>
              {isTelegramMobileAuthFlow && telegramMobileReturnLink ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    openMobileReturnLink(telegramMobileReturnLink);
                  }}
                >
                  {copy.authReturnToApp}
                </button>
              ) : null}
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  void logout();
                }}
              >
                {copy.authLogout}
              </button>
            </div>
          )}
        </article>

        <article className="panel">
          <h2><IconWallet /> {copy.walletTitle}</h2>
          <div className="stack">
            <p>
              {copy.walletBalance}:{' '}
              <strong>{wallet ? `${wallet.balance} LKM` : '-'}</strong>
            </p>
            <p>
              {copy.walletNominalRate}:{' '}
              <strong>
                1 LKM = {packages ? formatNumber(packages.nominalRubPerLkm) : '1.00'} RUB
              </strong>
            </p>
            {!isTelegramAuthorizedSession ? (
              <p className="note">
                {copy.walletVerificationBot}: <code>@vedamatch_bot</code>
              </p>
            ) : null}
            <div className="wallet-pro-preview">
              <div className="wallet-pro-preview-header">
                <strong>{copy.proPreviewTitle}</strong>
                <span className="note">{copy.proPreviewSubtitle}</span>
              </div>
              {proPlans.length > 0 ? (
                <div className="wallet-pro-preview-list">
                  {proPlans.map((plan) => (
                    <div key={plan.code} className="wallet-pro-preview-item">
                      <div className="wallet-pro-preview-main">
                        <span className="wallet-pro-preview-name">{getProPlanDisplayTitle(plan)}</span>
                        {plan.badge ? <span className="status-pill">{plan.badge}</span> : null}
                      </div>
                      <strong>{formatNumber(plan.priceLkm, 0)} LKM</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="note">{copy.proPreviewEmpty}</p>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2><IconZap /> {copy.topupTitle}</h2>
        {isLoading ? <p>{copy.topupLoadingPackages}</p> : null}

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
                      {formatNumber(pkg.totalPayAmount)} {pkg.payCurrency}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="custom-row">
              <label>
                {copy.topupCustomAmount}
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
                {formatCabinetCopy(copy.topupRangeTemplate, {
                  min: packages.customMinLkm,
                  max: packages.customMaxLkm,
                  step: packages.customStepLkm,
                })}
              </p>
            </div>

            <div className="selectors">
              <label>
                {copy.topupGateway}
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
                {copy.topupCurrency}
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
          <p className="note">{copy.topupPackagesAfterAuth}</p>
        )}
      </section>

      <section className="panel">
        <h2><IconCalculator /> {copy.calculatorTitle}</h2>
        {isBlockedInApp ? (
          <p className="warn">
            {copy.calculatorBlockedInApp}
          </p>
        ) : null}

        <div className="stack">
          <button type="button" onClick={createQuote} disabled={!canTopup || isCreatingQuote}>
            {isCreatingQuote ? copy.calculatorWorking : copy.calculatorGetQuote}
          </button>

          {quote ? (
            <div className="quote-box">
              <p>
                {copy.calculatorYouReceive}: <strong>{quote.receiveLkm} LKM</strong>
              </p>
              <p>
                {copy.calculatorYouPay}:{' '}
                <strong>
                  {formatNumber(quote.totalPayAmount)} {quote.payCurrency}
                </strong>
              </p>
              <p className="note">{quote.disclaimer}</p>
              <p className="note">
                {copy.calculatorQuoteValidUntil}: {new Date(quote.quoteExpiresAt).toLocaleString(locale)}
              </p>
              <button type="button" onClick={createTopup} disabled={isCreatingTopup}>
                {isCreatingTopup ? copy.calculatorCreatingTopup : copy.calculatorCreateTopup}
              </button>
            </div>
          ) : null}

          {topup ? (
            <div className="topup-box">
              <p>
                {copy.calculatorTopupId}: <code>{topup.topupId}</code>
              </p>
              <p>
                {copy.calculatorStatus}: <strong>{topup.status}</strong> · {copy.calculatorRiskRoute}: <strong>{topup.riskAction}</strong>
              </p>
              <p className="note">
                {formatCabinetCopy(copy.calculatorWebhookNote, { amount: topup.receiveLkm })}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2><IconHistory /> {copy.historyTitle}</h2>
        {!token ? <p className="note">{copy.historyNeedsAuth}</p> : null}

        {token ? (
          <div className="history-toolbar">
            <div className="history-filters">
              <label>
                {copy.historyStatusLabel}
                <select
                  value={historyStatus}
                  onChange={(event) => {
                    setHistoryStatus(normalizeHistoryStatus(event.target.value));
                    setHistoryPage(1);
                  }}
                >
                  <option value="all">{copy.statusLabels.all}</option>
                  <option value="pending_payment">{copy.statusLabels.pending_payment}</option>
                  <option value="paid">{copy.statusLabels.paid}</option>
                  <option value="manual_review">{copy.statusLabels.manual_review}</option>
                  <option value="credited">{copy.statusLabels.credited}</option>
                  <option value="rejected">{copy.statusLabels.rejected}</option>
                </select>
              </label>
              <label>
                {copy.historyPerPage}
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
                {copy.historyBack}
              </button>
              <span className="note">
                {formatCabinetCopy(copy.historyPageTemplate, { page: historyPage, pages: historyPages })}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => setHistoryPage((prev) => Math.min(historyPages, prev + 1))}
                disabled={isLoadingHistory || historyPage >= historyPages}
              >
                {copy.historyNext}
              </button>
            </div>
            <div className="history-actions">
              <button
                type="button"
                className="secondary"
                onClick={shareHistoryLink}
              >
                {copy.historyShare}
              </button>
              {historyShareFeedback ? (
                <span className="note">{historyShareFeedback}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {token && isLoadingHistory ? <p>{copy.historyLoading}</p> : null}

        {token && !isLoadingHistory && topupHistory.length === 0 ? (
          <p className="note">{copy.historyEmpty}</p>
        ) : null}

        {token && !isLoadingHistory && topupHistory.length > 0 ? (
          <div className="history-list">
            {topupHistory.map((item) => (
              <div key={item.topupId} className="history-row">
                <div className="history-main">
                  <p>
                    <strong>{item.receiveLkm} LKM</strong> · {formatNumber(item.totalPayAmount)} {item.payCurrency}
                  </p>
                  <p className="note">
                    <code>{item.topupId}</code>
                  </p>
                </div>
                <div className="history-meta">
                  <span className="status-pill">{humanTopupStatus(item.status, copy)}</span>
                  <span className="note">{copy.historyRiskLabel}: {item.riskAction}</span>
                  <span className="note">{new Date(item.createdAt).toLocaleString(locale)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {token && topupHistoryTotal > 0 ? (
          <p className="note">{formatCabinetCopy(copy.historyTotalTemplate, { total: topupHistoryTotal })}</p>
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
          throw new Error(formatCabinetCopy(copy.errorTimeoutTemplate, {
            seconds: Math.round(timeoutMs / 1000),
          }));
        }
        if (fetchError instanceof TypeError) {
          throw new Error(formatCabinetCopy(copy.errorNetworkTemplate, { url: requestUrl }));
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
