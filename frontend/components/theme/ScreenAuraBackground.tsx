import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BRAND_COLORS } from '../../theme/brandPalette';
import { AuraIntensity } from '../../theme/screenEffects';
import { ScreenThemeMode } from '../../theme/screenTheme';

type ScreenAuraBackgroundProps = {
  mode: ScreenThemeMode;
  intensity?: AuraIntensity;
  disableHeavyEffects?: boolean;
  variant?: 'portal' | 'chat' | 'settings' | 'market' | 'media' | 'default';
};

const getAuraOpacity = (intensity: AuraIntensity, variant: ScreenAuraBackgroundProps['variant']) => {
  const variantMultiplier = variant === 'portal' ? 0.74 : 1;

  if (intensity === 'high') return 1 * variantMultiplier;
  if (intensity === 'medium') return 0.72 * variantMultiplier;
  if (intensity === 'low') return 0.48 * variantMultiplier;
  return 0;
};

const getBaseGradientColors = (mode: ScreenThemeMode, variant: ScreenAuraBackgroundProps['variant']) => {
  const isDark = mode === 'dark';

  if (isDark) {
    return ['#18120A', '#20170D', '#171109'];
  }

  if (variant === 'portal') {
    return ['#F6E9D3', '#F3E1BE', '#EEDAB5'];
  }

  return ['#FFFCF4', '#FAF7F0', '#F8F2E4'];
};

const getRayColors = (mode: ScreenThemeMode, variant: ScreenAuraBackgroundProps['variant']) => {
  const isDark = mode === 'dark';

  if (isDark) {
    return ['rgba(255,215,145,0.12)', 'rgba(255,215,145,0.04)', 'rgba(255,215,145,0)'];
  }

  if (variant === 'portal') {
    return ['rgba(244,197,66,0.16)', 'rgba(255,209,120,0.06)', 'rgba(255,209,120,0)'];
  }

  return ['rgba(255,209,120,0.26)', 'rgba(255,209,120,0.1)', 'rgba(255,209,120,0)'];
};

const getRayOpacity = (mode: ScreenThemeMode, variant: ScreenAuraBackgroundProps['variant']) => {
  if (mode === 'dark') {
    return 0.45;
  }

  return variant === 'portal' ? 0.24 : 0.45;
};

export const ScreenAuraBackground: React.FC<ScreenAuraBackgroundProps> = ({
  mode,
  intensity = 'medium',
  disableHeavyEffects = false,
  variant = 'default',
}) => {
  const auraOpacity = getAuraOpacity(intensity, variant);
  const isDark = mode === 'dark';
  const showRays = !disableHeavyEffects && intensity !== 'off' && (Platform.OS === 'ios' || intensity === 'high');
  const baseGradientColors = getBaseGradientColors(mode, variant);
  const rayColors = getRayColors(mode, variant);
  const rayOpacity = getRayOpacity(mode, variant);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={baseGradientColors}
        start={{ x: 0.05, y: 0.03 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {auraOpacity > 0 ? (
        <View style={[styles.auraContainer, { opacity: auraOpacity }]}>
          <LinearGradient
            colors={
              isDark
                ? ['rgba(255,153,51,0.24)', 'rgba(255,153,51,0.08)', 'rgba(255,153,51,0)']
                : [BRAND_COLORS.glowSaffron, 'rgba(255,153,51,0.08)', 'rgba(255,153,51,0)']
            }
            start={{ x: 0.5, y: 0.1 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.radial, styles.radialTop]}
          />
          <LinearGradient
            colors={
              isDark
                ? ['rgba(244,197,66,0.2)', 'rgba(244,197,66,0.06)', 'rgba(244,197,66,0)']
                : [BRAND_COLORS.glowGold, 'rgba(244,197,66,0.08)', 'rgba(244,197,66,0)']
            }
            start={{ x: 0.4, y: 0.15 }}
            end={{ x: 0.7, y: 1 }}
            style={[styles.radial, styles.radialBottom]}
          />
        </View>
      ) : null}

      {showRays ? (
        <LinearGradient
          colors={rayColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.rays, { opacity: rayOpacity }]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  auraContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  radial: {
    position: 'absolute',
    borderRadius: 999,
  },
  radialTop: {
    width: 540,
    height: 540,
    top: -260,
    left: -120,
  },
  radialBottom: {
    width: 620,
    height: 620,
    bottom: -360,
    right: -200,
  },
  rays: {
    ...StyleSheet.absoluteFillObject,
  },
});
