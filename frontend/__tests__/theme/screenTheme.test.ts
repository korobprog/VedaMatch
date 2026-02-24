import { BRAND_COLORS } from '../../theme/brandPalette';
import { ScreenThemeDark, ScreenThemeLight } from '../../theme/screenTheme';

const hexToRgb = (hex: string) => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const value = Number.parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrastRatio = (fg: string, bg: string) => {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('screen theme tokens', () => {
  it('uses required saffron/gold/base anchors in light mode', () => {
    expect(ScreenThemeLight.colors.primary).toBe(BRAND_COLORS.saffron);
    expect(ScreenThemeLight.colors.secondary).toBe(BRAND_COLORS.gold);
    expect(ScreenThemeLight.colors.background).toBe(BRAND_COLORS.base);
  });

  it('keeps dark mode as separate high-contrast palette', () => {
    expect(ScreenThemeDark.mode).toBe('dark');
    expect(ScreenThemeDark.colors.background).not.toBe(ScreenThemeLight.colors.background);
    expect(ScreenThemeDark.colors.text).not.toBe(ScreenThemeLight.colors.text);
  });

  it('keeps minimum readable text contrast for core pairs', () => {
    expect(contrastRatio(ScreenThemeLight.colors.text, ScreenThemeLight.colors.background)).toBeGreaterThan(7);
    expect(contrastRatio(ScreenThemeDark.colors.text, ScreenThemeDark.colors.background)).toBeGreaterThan(7);
  });
});

