import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { SemanticColorTokens } from '../../theme/semanticTokens';

type ButtonTone = 'accent' | 'neutral' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonState = 'default' | 'loading' | 'disabled';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  colors: SemanticColorTokens;
  tone?: ButtonTone;
  size?: ButtonSize;
  state?: ButtonState;
  style?: ViewStyle;
  testID?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  colors,
  tone = 'accent',
  size = 'md',
  state = 'default',
  style,
  testID,
}) => {
  const disabled = state === 'disabled' || state === 'loading';
  const backgroundColor = tone === 'danger' ? colors.danger : tone === 'neutral' ? colors.surface : colors.accent;
  const textColor = tone === 'neutral' ? colors.textPrimary : '#FFFFFF';
  const paddingVertical = size === 'lg' ? 14 : size === 'sm' ? 8 : 12;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: colors.border,
          paddingVertical,
          opacity: disabled ? 0.6 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {state === 'loading' ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
