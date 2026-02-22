import { Platform } from 'react-native';
import { PerformanceMode, PerformanceDegradeReason } from '../context/SettingsContext';

export interface RuntimePerformanceState {
  isAutoDegraded: boolean;
  reason?: PerformanceDegradeReason;
}

export interface AndroidVisualPolicy {
  enableBlur: boolean;
  maxBlurAmount: number;
  allowShimmer: boolean;
  allowGiftPulse: boolean;
  allowCrossfade: boolean;
  crossfadeDurationMs: number;
}

export const resolveEffectivePerformanceMode = (
  mode: PerformanceMode,
  runtime: RuntimePerformanceState,
): PerformanceMode => {
  if (Platform.OS !== 'android') return mode;
  if (mode === 'adaptive' && runtime.isAutoDegraded) return 'battery_saver';
  return mode;
};

export const getAndroidVisualPolicy = (
  mode: PerformanceMode,
  runtime: RuntimePerformanceState,
): AndroidVisualPolicy => {
  if (Platform.OS !== 'android') {
    return {
      enableBlur: true,
      maxBlurAmount: 20,
      allowShimmer: true,
      allowGiftPulse: true,
      allowCrossfade: true,
      crossfadeDurationMs: 1000,
    };
  }

  const effective = resolveEffectivePerformanceMode(mode, runtime);
  if (effective === 'high_quality') {
    return {
      enableBlur: true,
      maxBlurAmount: 20,
      allowShimmer: true,
      allowGiftPulse: true,
      allowCrossfade: true,
      crossfadeDurationMs: 850,
    };
  }

  if (effective === 'adaptive') {
    return {
      enableBlur: true,
      maxBlurAmount: 10,
      allowShimmer: true,
      allowGiftPulse: false,
      allowCrossfade: true,
      crossfadeDurationMs: 450,
    };
  }

  return {
    enableBlur: false,
    maxBlurAmount: 0,
    allowShimmer: false,
    allowGiftPulse: false,
    allowCrossfade: false,
    crossfadeDurationMs: 0,
  };
};

export const getBlurAmountForPolicy = (policy: AndroidVisualPolicy, requestedAmount: number): number =>
  Math.min(Math.max(requestedAmount, 0), policy.maxBlurAmount);

