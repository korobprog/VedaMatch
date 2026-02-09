import { SemanticColorTokens } from './semanticTokens';

export interface ComponentTokens {
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  topBar: {
    background: string;
    border: string;
    icon: string;
  };
  card: {
    background: string;
    border: string;
    accentBorder: string;
  };
  input: {
    background: string;
    border: string;
    text: string;
    placeholder: string;
  };
  button: {
    primaryText: string;
    ghostText: string;
  };
}

export function buildComponentTokens(colors: SemanticColorTokens): ComponentTokens {
  return {
    radius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      pill: 999,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      xxl: 32,
    },
    topBar: {
      background: colors.surface,
      border: colors.border,
      icon: colors.textSecondary,
    },
    card: {
      background: colors.surface,
      border: colors.border,
      accentBorder: colors.accent,
    },
    input: {
      background: colors.surface,
      border: colors.border,
      text: colors.textPrimary,
      placeholder: colors.textSecondary,
    },
    button: {
      primaryText: '#FFFFFF',
      ghostText: colors.textPrimary,
    },
  };
}
