'use client';

const DEVICE_ID_KEY = 'lkm_device_id';
const TELEGRAM_LAUNCH_PARAMS_KEY = 'lkm_telegram_launch_params';
const TELEGRAM_MINI_APP_HINT_KEY = 'lkm_telegram_mini_app_hint';
const TELEGRAM_MOBILE_AUTH_PREFIX = 'vm_auth_';
const CIS_LANGUAGE_CODES = new Set(['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'hy', 'az', 'mo']);

export type TelegramMiniAppUser = {
  id?: number;
  language_code?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export type TelegramLaunchParams = {
  initData: string;
  startParam: string;
  user: TelegramMiniAppUser | null;
};

export type TelegramWebApp = {
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

export type TelegramBootstrapContext = {
  hasTelegramSurface: boolean;
  initData: string;
  startParam: string;
  user: TelegramMiniAppUser | null;
  mobileAuthState: string;
  languageCode: string;
};

export function getTelegramWebApp(): TelegramWebApp | null {
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

export function extractTelegramLaunchParamsFromLocation(location: Location): TelegramLaunchParams {
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

export function readSavedTelegramLaunchParams(): TelegramLaunchParams {
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

export function persistTelegramLaunchParams(params: TelegramLaunchParams): void {
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

export function readTelegramMiniAppHint(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.sessionStorage.getItem(TELEGRAM_MINI_APP_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistTelegramMiniAppHint(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(TELEGRAM_MINI_APP_HINT_KEY, '1');
  } catch {
    // Ignore storage quota/unavailability and continue with in-memory flow.
  }
}

export function openMobileReturnLink(url: string): void {
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

export function buildTelegramMobileReturnLink(state: string): string {
  const normalizedState = state.trim();
  if (!normalizedState) {
    return '';
  }

  const params = new URLSearchParams();
  params.set('state', normalizedState);
  return `https://api.vedamatch.ru/auth/telegram/callback?${params.toString()}`;
}

export function normalizeLanguageCode(raw: string | undefined): string {
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

export function resolveMiniAppTargetHost(languageCode: string): string {
  if (CIS_LANGUAGE_CODES.has(normalizeLanguageCode(languageCode))) {
    return 'lkm.vedamatch.ru';
  }
  return 'lkm.vedamatch.com';
}

export function isLkmVedamatchHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  return host === 'lkm.vedamatch.ru' || host === 'lkm.vedamatch.com';
}

export function extractTelegramMobileAuthStateFromStartParam(raw: string | null | undefined): string {
  const value = (raw || '').trim();
  if (!value.startsWith(TELEGRAM_MOBILE_AUTH_PREFIX)) {
    return '';
  }
  return value.slice(TELEGRAM_MOBILE_AUTH_PREFIX.length).trim();
}

export function getOrCreateLkmDeviceID(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)?.trim() || '';
  if (existing) {
    return existing;
  }
  const next = `lkm-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export function resolveTelegramBootstrapContext(location: Location): TelegramBootstrapContext {
  const telegramWebApp = getTelegramWebApp();
  const locationLaunchParams = extractTelegramLaunchParamsFromLocation(location);
  const savedLaunchParams = readSavedTelegramLaunchParams();
  const hasSavedTelegramHint = readTelegramMiniAppHint();
  const initData = (
    telegramWebApp?.initData?.trim()
    || locationLaunchParams.initData
    || savedLaunchParams.initData
  );
  const user = (
    telegramWebApp?.initDataUnsafe?.user
    || locationLaunchParams.user
    || savedLaunchParams.user
    || null
  );
  const startParam = (
    telegramWebApp?.initDataUnsafe?.start_param?.trim()
    || locationLaunchParams.startParam
    || savedLaunchParams.startParam
  );

  return {
    hasTelegramSurface: !!(telegramWebApp || initData || hasSavedTelegramHint),
    initData,
    startParam,
    user,
    mobileAuthState: extractTelegramMobileAuthStateFromStartParam(startParam),
    languageCode: normalizeLanguageCode(user?.language_code),
  };
}
