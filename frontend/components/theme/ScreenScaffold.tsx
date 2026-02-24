import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSettings } from '../../context/SettingsContext';
import { resolveAuraEffectConfig } from '../../theme/screenEffects';
import { ScreenAuraBackground } from './ScreenAuraBackground';

type ScreenScaffoldProps = {
  variant?: 'portal' | 'chat' | 'settings' | 'market' | 'media' | 'default';
  enableAura?: boolean;
  transparentBackground?: boolean;
  headerStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  children: React.ReactNode;
};

export const ScreenScaffold: React.FC<ScreenScaffoldProps> = ({
  variant = 'default',
  enableAura = true,
  transparentBackground = false,
  headerStyle,
  contentStyle,
  children,
}) => {
  const { vTheme, performanceMode, runtimePerformanceState, screenVisualStyle } = useSettings();
  const auraConfig = resolveAuraEffectConfig(performanceMode, runtimePerformanceState);
  const mode = vTheme.mode;
  const isSaffronStyle = screenVisualStyle === 'saffron';
  const shouldRenderAura = enableAura && isSaffronStyle;
  const shouldRenderGlass = isSaffronStyle;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: transparentBackground ? 'transparent' : vTheme.colors.background },
      ]}
    >
      {shouldRenderAura ? (
        <ScreenAuraBackground
          mode={mode}
          intensity={auraConfig.intensity}
          disableHeavyEffects={auraConfig.disableHeavyEffects}
          variant={variant}
        />
      ) : null}

      {shouldRenderGlass ? (
        <View style={[styles.headerGlass, { backgroundColor: vTheme.colors.topBar, borderBottomColor: vTheme.colors.glassBorder }, headerStyle]} />
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
      {shouldRenderGlass ? (
        <View style={[styles.bottomGlass, { backgroundColor: vTheme.colors.glass, borderTopColor: vTheme.colors.glassBorder }]} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 104,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  bottomGlass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 0,
  },
});
