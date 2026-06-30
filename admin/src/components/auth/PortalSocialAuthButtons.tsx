'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { persistAdminAuthPayload } from '@/lib/shared-session';
import { buildVedamatchUrl, resolveApiBaseUrlForHostname, resolveVedamatchSurface } from '@/lib/vedamatch-hosts';

type LoginResponse = {
  token?: string;
  accessToken?: string;
  user?: {
    ID?: number;
    id?: number;
    email?: string;
    spiritualName?: string;
    karmicName?: string;
    role?: string;
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
  provider?: string;
  status?: 'success' | 'error';
  error?: string;
  authPayload?: LoginResponse;
};

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-service';
const SOCIAL_AUTH_POPUP_SOURCE = 'vedamatch:lkm-social-auth';

function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const key = 'vedamatch_web_device_id';
  const existing = window.localStorage.getItem(key)?.trim();
  if (existing) {
    return existing;
  }

  const next = `web-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function buildErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function persistAuthPayload(payload: LoginResponse): string | null {
  const session = persistAdminAuthPayload(payload);
  return typeof session?.role === 'string' ? session.role : null;
}

export default function PortalSocialAuthButtons() {
  const [config, setConfig] = useState<SocialAuthConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [vkLoading, setVkLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupPollRef = useRef<number | null>(null);
  const popupResolvedRef = useRef(false);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'admin.vedamatch.ru';
  const apiBaseUrl = useMemo(() => resolveApiBaseUrlForHostname(hostname).replace(/\/+$/, ''), [hostname]);
  const apiOrigin = useMemo(() => {
    try {
      return new URL(apiBaseUrl).origin;
    } catch {
      return '';
    }
  }, [apiBaseUrl]);
  const socialOrigin = useMemo(() => buildVedamatchUrl(hostname, 'social', '', '').replace(/\/$/, ''), [hostname]);
  const panelDashboardUrl = useMemo(() => buildVedamatchUrl(hostname, 'panel', '/dashboard', ''), [hostname]);
  const surface = useMemo(() => resolveVedamatchSurface(hostname), [hostname]);
  const userDashboardUrl = useMemo(() => {
    if (surface === 'social') {
      return buildVedamatchUrl(hostname, 'social', '/user/dashboard', '');
    }
    return buildVedamatchUrl(hostname, 'admin', '/user/dashboard', '');
  }, [hostname, surface]);

  const finalizeAuth = useCallback((payload: LoginResponse) => {
    persistAuthPayload(payload);
    const targetUrl = surface === 'panel' ? panelDashboardUrl : userDashboardUrl;
    window.location.assign(targetUrl);
  }, [panelDashboardUrl, surface, userDashboardUrl]);

  const performSocialLogin = useCallback(async (path: string, body: unknown): Promise<LoginResponse> => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload as LoginResponse;
  }, [apiBaseUrl]);

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    const idToken = (response.credential || '').trim();
    if (!idToken) {
      setError('Google did not return an ID token.');
      return;
    }

    setError('');
    setGoogleLoading(true);
    try {
      const payload = await performSocialLogin('/auth/google/login', {
        idToken,
        deviceId: getDeviceId() || undefined,
      });
      finalizeAuth(payload);
    } catch (authError) {
      setError(buildErrorMessage(authError, 'Google sign-in failed.'));
    } finally {
      setGoogleLoading(false);
    }
  }, [finalizeAuth, performSocialLogin]);

  useEffect(() => {
    let cancelled = false;
    setConfigLoading(true);

    fetch(`${apiBaseUrl}/auth/social/config`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as SocialAuthConfigResponse;
        if (!response.ok) {
          throw new Error('Could not load social auth config.');
        }
        if (!cancelled) {
          setConfig(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    const clientId = (config?.google?.clientId || '').trim();
    if (!config?.google?.enabled || !clientId || !googleButtonRef.current) {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;

    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      renderButton();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [config?.google?.clientId, config?.google?.enabled, handleGoogleCredential]);

  useEffect(() => {
    if (!apiOrigin) {
      return;
    }

    const handleMessage = (event: MessageEvent<SocialAuthPopupMessage>) => {
      if (event.origin !== apiOrigin) {
        return;
      }

      const message = event.data;
      if (!message || message.source !== SOCIAL_AUTH_POPUP_SOURCE || message.provider !== 'vk') {
        return;
      }

      if (popupPollRef.current) {
        window.clearInterval(popupPollRef.current);
        popupPollRef.current = null;
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      popupResolvedRef.current = true;
      setVkLoading(false);

      if (message.status === 'success' && message.authPayload) {
        finalizeAuth(message.authPayload);
        return;
      }

      setError(message.error || 'VK sign-in failed.');
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [apiOrigin, finalizeAuth]);

  useEffect(() => {
    return () => {
      if (popupPollRef.current) {
        window.clearInterval(popupPollRef.current);
      }
    };
  }, []);

  const handleVKLogin = useCallback(() => {
    if (!config?.vk?.enabled) {
      setError('VK web auth is not configured.');
      return;
    }

    setError('');
    setVkLoading(true);

    const startUrl = `${apiBaseUrl}/auth/vk/web/start?origin=${encodeURIComponent(socialOrigin)}&deviceId=${encodeURIComponent(getDeviceId())}`;
    const width = 560;
    const height = 720;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const popup = window.open(startUrl, 'vedamatch-vk-login', features);

    if (!popup) {
      setVkLoading(false);
      setError('VK popup was blocked by the browser.');
      return;
    }

    popupRef.current = popup;
    popupResolvedRef.current = false;
    popup.focus();

    if (popupPollRef.current) {
      window.clearInterval(popupPollRef.current);
    }
    popupPollRef.current = window.setInterval(() => {
      const currentPopup = popupRef.current;
      if (!currentPopup || currentPopup.closed) {
        if (popupPollRef.current) {
          window.clearInterval(popupPollRef.current);
          popupPollRef.current = null;
        }
        if (!popupResolvedRef.current) {
          setError('VK sign-in window was closed before completion.');
        }
        popupRef.current = null;
        setVkLoading(false);
      }
    }, 400);
  }, [apiBaseUrl, config?.vk?.enabled, socialOrigin]);

  const showGoogle = !!config?.google?.enabled && !!config?.google?.clientId;
  const showVK = !!config?.vk?.enabled;

  if (!configLoading && !showGoogle && !showVK) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />
        <span className="relative bg-[var(--card)] px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Or continue with
        </span>
      </div>

      <div className="space-y-3">
        {showGoogle ? (
          <div className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-2">
            {googleLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-600" /> : <div ref={googleButtonRef} />}
          </div>
        ) : null}

        {showVK ? (
          <button
            type="button"
            onClick={handleVKLogin}
            disabled={vkLoading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0077ff] font-semibold text-white transition hover:bg-[#0066db] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {vkLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue with VK'}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-center text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
