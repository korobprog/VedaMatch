import { PortalRole } from '../types/portalBlueprint';

export type ResolvedPortalRole = Exclude<PortalRole, 'admin' | 'superadmin'>;

export interface RoleTheme {
  role: ResolvedPortalRole;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentMuted: string;
  gradient: [string, string, string];
}

const BASE_ROLE_THEMES: Record<ResolvedPortalRole, RoleTheme> = {
  user: {
    role: 'user',
    accent: '#6B7280',
    accentStrong: '#4B5563',
    accentSoft: 'rgba(107,114,128,0.18)',
    accentMuted: 'rgba(107,114,128,0.08)',
    gradient: ['#0F172A', '#111827', '#0B1220'],
  },
  in_goodness: {
    role: 'in_goodness',
    accent: '#22C55E',
    accentStrong: '#16A34A',
    accentSoft: 'rgba(34,197,94,0.2)',
    accentMuted: 'rgba(34,197,94,0.08)',
    gradient: ['#0B1F14', '#102A1A', '#0D1C14'],
  },
  yogi: {
    role: 'yogi',
    accent: '#0EA5E9',
    accentStrong: '#0284C7',
    accentSoft: 'rgba(14,165,233,0.2)',
    accentMuted: 'rgba(14,165,233,0.08)',
    gradient: ['#081B2A', '#0B2436', '#071A28'],
  },
  devotee: {
    role: 'devotee',
    accent: '#F97316',
    accentStrong: '#EA580C',
    accentSoft: 'rgba(249,115,22,0.2)',
    accentMuted: 'rgba(249,115,22,0.08)',
    gradient: ['#2A1408', '#321809', '#241207'],
  },
};

export function resolvePortalRole(role?: PortalRole | string | null): ResolvedPortalRole {
  if (role === 'in_goodness' || role === 'yogi' || role === 'devotee') {
    return role;
  }
  return 'user';
}

export function getRoleTheme(role?: PortalRole | string | null): RoleTheme {
  return BASE_ROLE_THEMES[resolvePortalRole(role)];
}

export const ROLE_THEMES = BASE_ROLE_THEMES;
