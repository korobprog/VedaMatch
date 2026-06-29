export type VedamatchSurface = 'portal' | 'social' | 'panel' | 'lkm' | 'union' | 'vedabase' | 'motivation' | 'local' | 'unknown';
export type VedamatchSubdomain = 'admin' | 'social' | 'panel' | 'lkm' | 'union' | 'vedabase' | 'motivation' | 'api';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const PUBLIC_PORTAL_PREFIXES = [
  '/',
  '/profile',
  '/feed-posts',
  '/android-testers',
  '/terms',
  '/privacy',
  '/delete-account',
  '/library',
  '/library/bookmarks',
  '/offline',
];
const PANEL_PREFIXES = [
  '/admin-login',
  '/dashboard',
  '/users',
  '/referrals',
  '/monetization',
  '/payments',
  '/feed-control',
  '/financials',
  '/multimedia',
  '/calendar',
  '/dhama',
  '/dhama/collections',
  '/series',
  '/organizers',
  '/organizers/',
  '/yatra',
  '/charity',
  '/admins',
  '/settings',
  '/polza',
  '/openrouter',
  '/ai-prompts',
  '/notifications',
  '/motivation',
  '/gemini-keys',
  '/admin',
];

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().trim().replace(/:\d+$/, '');
}

export function resolveVedamatchRootDomain(hostname: string): 'vedamatch.ru' | 'vedamatch.com' | null {
  const normalized = normalizeHostname(hostname);
  if (normalized === 'vedamatch.ru' || normalized.endsWith('.vedamatch.ru')) {
    return 'vedamatch.ru';
  }
  if (normalized === 'vedamatch.com' || normalized.endsWith('.vedamatch.com')) {
    return 'vedamatch.com';
  }
  return null;
}

export function resolveVedamatchSurface(hostname: string): VedamatchSurface {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    return 'local';
  }
  if (normalized === 'admin.vedamatch.ru' || normalized === 'admin.vedamatch.com') {
    return 'portal';
  }
  if (normalized === 'social.vedamatch.ru' || normalized === 'social.vedamatch.com') {
    return 'social';
  }
  if (normalized === 'panel.vedamatch.ru' || normalized === 'panel.vedamatch.com') {
    return 'panel';
  }
  if (normalized === 'lkm.vedamatch.ru' || normalized === 'lkm.vedamatch.com') {
    return 'lkm';
  }
  if (normalized === 'union.vedamatch.ru' || normalized === 'union.vedamatch.com') {
    return 'union';
  }
  if (normalized === 'vedabase.vedamatch.ru' || normalized === 'vedabase.vedamatch.com') {
    return 'vedabase';
  }
  if (normalized === 'motivation.vedamatch.ru' || normalized === 'motivation.vedamatch.com') {
    return 'motivation';
  }
  return 'unknown';
}

export function buildVedamatchOrigin(hostname: string, subdomain: VedamatchSubdomain): string {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    return `http://${normalized}:3005`;
  }

  const rootDomain = resolveVedamatchRootDomain(normalized);
  if (!rootDomain) {
    return '';
  }

  return `https://${subdomain}.${rootDomain}`;
}

export function buildVedamatchUrl(hostname: string, subdomain: VedamatchSubdomain, pathname: string, search = ''): string {
  const origin = buildVedamatchOrigin(hostname, subdomain);
  if (!origin) {
    return pathname + search;
  }
  return `${origin}${pathname}${search}`;
}

export function resolveApiBaseUrlForHostname(hostname: string): string {
  const normalized = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(normalized)) {
    return 'http://localhost:8081/api';
  }
  if (normalized.endsWith('.vedamatch.com') || normalized === 'vedamatch.com') {
    return 'https://api.vedamatch.com/api';
  }
  return 'https://api.vedamatch.ru/api';
}

export function isSocialAuthPath(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register';
}

export function isPanelRoute(pathname: string): boolean {
  return PANEL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPublicPortalPath(pathname: string): boolean {
  return PUBLIC_PORTAL_PREFIXES.some((prefix) => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`)));
}
