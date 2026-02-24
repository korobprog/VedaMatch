import { BRAND_COLORS, BRAND_COLORS_DARK } from './brandPalette';

export type ScreenThemeMode = 'light' | 'dark';

export type ScreenTheme = {
  mode: ScreenThemeMode;
  colors: {
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    textLight: string;
    primary: string;
    secondary: string;
    accent: string;
    accentSoft: string;
    border: string;
    divider: string;
    glass: string;
    glassBorder: string;
    shadow: string;
    gradientStart: string;
    gradientEnd: string;
    aiButtonStart: string;
    aiButtonEnd: string;
    topBar: string;
    focus: string;
    overlay: string;
    glowSaffron: string;
    glowGold: string;
  };
  typography: {
    header: { fontFamily: string; fontSize: number; fontWeight: '700'; letterSpacing: number };
    subHeader: { fontFamily: string; fontSize: number; fontWeight: '500'; letterSpacing: number };
    body: { fontFamily: string; fontSize: number };
    caption: { fontFamily: string; fontSize: number };
  };
  shadows: {
    soft: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    medium: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    glow: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  layout: {
    borderRadius: { sm: number; md: number; lg: number; xl: number };
    spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  };
};

const TYPOGRAPHY = {
  header: {
    fontFamily: 'Playfair Display',
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  subHeader: {
    fontFamily: 'Cinzel',
    fontSize: 18,
    fontWeight: '500' as const,
    letterSpacing: 1.8,
  },
  body: {
    fontFamily: 'Nunito',
    fontSize: 16,
  },
  caption: {
    fontFamily: 'Nunito',
    fontSize: 12,
  },
};

const LAYOUT = {
  borderRadius: { sm: 8, md: 16, lg: 24, xl: 32 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

export const ScreenThemeLight: ScreenTheme = {
  mode: 'light',
  colors: {
    background: BRAND_COLORS.base,
    backgroundSecondary: '#FFFBF3',
    surface: BRAND_COLORS.cream,
    surfaceElevated: '#FFFFFF',
    text: BRAND_COLORS.ink,
    textSecondary: BRAND_COLORS.inkSoft,
    textLight: '#FFFFFF',
    primary: BRAND_COLORS.saffron,
    secondary: BRAND_COLORS.gold,
    accent: BRAND_COLORS.saffron,
    accentSoft: BRAND_COLORS.warmOverlay,
    border: BRAND_COLORS.warmBorder,
    divider: 'rgba(124, 93, 52, 0.18)',
    glass: 'rgba(255, 253, 248, 0.72)',
    glassBorder: 'rgba(255, 245, 220, 0.94)',
    shadow: 'rgba(141, 91, 24, 0.24)',
    gradientStart: BRAND_COLORS.saffron,
    gradientEnd: BRAND_COLORS.gold,
    aiButtonStart: '#F08C24',
    aiButtonEnd: BRAND_COLORS.gold,
    topBar: 'rgba(255, 252, 244, 0.8)',
    focus: '#E18320',
    overlay: 'rgba(84, 56, 18, 0.18)',
    glowSaffron: BRAND_COLORS.glowSaffron,
    glowGold: BRAND_COLORS.glowGold,
  },
  typography: TYPOGRAPHY,
  shadows: {
    soft: {
      shadowColor: '#C28031',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
    medium: {
      shadowColor: '#B87422',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 7,
    },
    glow: {
      shadowColor: BRAND_COLORS.saffron,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 9,
    },
  },
  layout: LAYOUT,
};

export const ScreenThemeDark: ScreenTheme = {
  mode: 'dark',
  colors: {
    background: BRAND_COLORS_DARK.background,
    backgroundSecondary: BRAND_COLORS_DARK.backgroundSecondary,
    surface: BRAND_COLORS_DARK.surface,
    surfaceElevated: BRAND_COLORS_DARK.surfaceElevated,
    text: BRAND_COLORS_DARK.text,
    textSecondary: BRAND_COLORS_DARK.textSecondary,
    textLight: '#FFFFFF',
    primary: BRAND_COLORS.saffron,
    secondary: BRAND_COLORS.gold,
    accent: BRAND_COLORS.saffron,
    accentSoft: 'rgba(255, 153, 51, 0.18)',
    border: BRAND_COLORS_DARK.border,
    divider: 'rgba(255, 210, 133, 0.2)',
    glass: 'rgba(39, 27, 15, 0.72)',
    glassBorder: 'rgba(255, 214, 145, 0.2)',
    shadow: '#000000',
    gradientStart: '#F08C24',
    gradientEnd: BRAND_COLORS.gold,
    aiButtonStart: '#F08C24',
    aiButtonEnd: BRAND_COLORS.gold,
    topBar: 'rgba(35, 24, 14, 0.76)',
    focus: '#F4C542',
    overlay: BRAND_COLORS_DARK.overlay,
    glowSaffron: BRAND_COLORS_DARK.glowSaffron,
    glowGold: BRAND_COLORS_DARK.glowGold,
  },
  typography: TYPOGRAPHY,
  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 9,
      elevation: 5,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    glow: {
      shadowColor: BRAND_COLORS.saffron,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.24,
      shadowRadius: 14,
      elevation: 8,
    },
  },
  layout: LAYOUT,
};

