import { Platform } from 'react-native';

type PerformanceMode = 'adaptive' | 'high_quality' | 'battery_saver';

export type AuraIntensity = 'high' | 'medium' | 'low' | 'off';

export type AuraEffectConfig = {
  intensity: AuraIntensity;
  disableHeavyEffects: boolean;
};

export function resolveAuraEffectConfig(
  performanceMode?: PerformanceMode,
  runtime?: { isAutoDegraded?: boolean },
): AuraEffectConfig {
  const degraded = Boolean(runtime?.isAutoDegraded);

  if (performanceMode === 'battery_saver') {
    return { intensity: 'low', disableHeavyEffects: true };
  }

  if (performanceMode === 'adaptive' && degraded) {
    return { intensity: 'low', disableHeavyEffects: true };
  }

  if (Platform.OS === 'android' && performanceMode === 'adaptive') {
    return { intensity: 'medium', disableHeavyEffects: false };
  }

  if (performanceMode === 'high_quality') {
    return { intensity: 'high', disableHeavyEffects: false };
  }

  return { intensity: 'medium', disableHeavyEffects: false };
}
