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
      sm: 10,
      md: 14,
      lg: 18,
      xl: 24,
      pill: 999,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 14,
      lg: 18,
      xl: 26,
      xxl: 34,
    },
    topBar: {
      background: colors.surfaceElevated,
      border: colors.border,
      icon: colors.textPrimary,
    },
    card: {
      background: colors.surfaceElevated,
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
      primaryText: colors.textPrimary,
      ghostText: colors.textPrimary,
    },
  };
}
