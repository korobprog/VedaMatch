import { RoleTheme } from './roleThemes';

export interface SemanticColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  focusRing: string;
  overlay: string;
}

export function buildSemanticTokens(roleTheme: RoleTheme, isDarkMode: boolean): SemanticColorTokens {
  if (isDarkMode) {
    return {
      background: roleTheme.gradient[0],
      surface: 'rgba(15,23,42,0.6)',
      surfaceElevated: 'rgba(15,23,42,0.82)',
      textPrimary: '#F8FAFC',
      textSecondary: 'rgba(248,250,252,0.72)',
      accent: roleTheme.accent,
      accentSoft: roleTheme.accentSoft,
      border: 'rgba(255,255,255,0.18)',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
      focusRing: roleTheme.accent,
      overlay: 'rgba(2,6,23,0.6)',
    };
  }

  return {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    accent: roleTheme.accent,
    accentSoft: roleTheme.accentMuted,
    border: '#CBD5E1',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    focusRing: roleTheme.accent,
    overlay: 'rgba(15,23,42,0.5)',
  };
}
